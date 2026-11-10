import test from 'node:test';
import assert from 'node:assert/strict';
import { feedToBooks, mapCategory, parseCsv } from './feeds.js';

const known = new Set(['Sci-Fi & Fantasy', 'Mystery & Suspense', 'Fiction & Literature', 'Non-Fiction & Essays', 'Consciousness & Ancient Wisdom', 'Spiritual Healing & Alignment']);

test('CSV fields may hold commas, quotes and line breaks', () => {
  assert.deepEqual(parseCsv('a,b\n"x, y","say ""hi""\nthere"\r\n\n'), [['a', 'b'], ['x, y', 'say "hi"\nthere']]);
});

test('BISAC and Thema subjects map to BookAtlas categories', () => {
  assert.equal(mapCategory('FIC028000', known), 'Sci-Fi & Fantasy');
  assert.equal(mapCategory('FIC022010', known), 'Mystery & Suspense');
  assert.equal(mapCategory('HIS037000', known), 'Non-Fiction & Essays');
  assert.equal(mapCategory('FMB', known), 'Sci-Fi & Fantasy');
  assert.equal(mapCategory('VXA', known), 'Consciousness & Ancient Wisdom');
  assert.equal(mapCategory('Spiritual Healing & Alignment', known), 'Spiritual Healing & Alignment');
  assert.equal(mapCategory('not a code at all', known), null);
});

test('a CSV feed becomes listed books; bad rows are reported, not imported', () => {
  const csv = [
    'isbn,title,author,price,format,categories,cover_url,narrator,duration_minutes',
    '978-1-326-15795-1,The Awakened Codex,Apehgong Edwin Chi,9.99,ebook,Spiritual Healing & Alignment|OCC000000,https://covers.example/1.jpg,,',
    '9780306406157,"Stars, Again",Ada Writer|Bo Coauthor,4.5,audiobook,FIC028000,javascript:alert(1),Nia Voice,610',
    '9780306406158,Bad Check Digit,Someone,3,ebook,,,,',
    '9780306406157,,No Title,3,ebook,,,,',
  ].join('\n');
  const { books, errors } = feedToBooks('csv', csv, known);
  assert.equal(books.length, 2);
  const [codex, stars] = books;
  assert.equal(codex!.id, 'isbn-9781326157951');
  assert.equal(codex!.availability, 'listed');
  assert.deepEqual(codex!.genres, ['Spiritual Healing & Alignment', 'Consciousness & Ancient Wisdom']);
  assert.equal(stars!.author, 'Ada Writer, Bo Coauthor');
  assert.equal(stars!.coverImage, '', 'only https cover links are kept');
  assert.equal(stars!.audioDurationMinutes, 610);
  assert.deepEqual(errors.map((e) => e.reason), ['ISBN-13 missing or invalid.', 'Title missing.']);
});

test('an ONIX 3.0 feed becomes listed books', () => {
  const onix = `<?xml version="1.0"?><ONIXMessage release="3.0"><Header/>
  <Product><RecordReference>x1</RecordReference>
    <ProductIdentifier><ProductIDType>15</ProductIDType><IDValue>9780306406157</IDValue></ProductIdentifier>
    <DescriptiveDetail><ProductForm>AJ</ProductForm>
      <TitleDetail><TitleType>01</TitleType><TitleElement><TitleElementLevel>01</TitleElementLevel><TitleText>Echoes &amp; Stars</TitleText><Subtitle>A Novel</Subtitle></TitleElement></TitleDetail>
      <Contributor><ContributorRole>A01</ContributorRole><PersonName>Ada Writer</PersonName></Contributor>
      <Contributor><ContributorRole>E07</ContributorRole><NamesBeforeKey>Nia</NamesBeforeKey><KeyNames>Voice</KeyNames></Contributor>
      <Language><LanguageRole>01</LanguageRole><LanguageCode>dut</LanguageCode></Language>
      <Extent><ExtentType>09</ExtentType><ExtentValue>7</ExtentValue><ExtentUnit>06</ExtentUnit></Extent>
      <Subject><SubjectSchemeIdentifier>10</SubjectSchemeIdentifier><SubjectCode>FIC028000</SubjectCode></Subject>
    </DescriptiveDetail>
    <CollateralDetail><TextContent><TextType>03</TextType><Text>A <b>bold</b> story.</Text></TextContent>
      <SupportingResource><ResourceContentType>01</ResourceContentType><ResourceVersion><ResourceLink>https://covers.example/x1.jpg</ResourceLink></ResourceVersion></SupportingResource></CollateralDetail>
    <PublishingDetail><Publisher><PublisherName>Feed Press</PublisherName></Publisher><PublishingDate><PublishingDateRole>01</PublishingDateRole><Date>20260301</Date></PublishingDate></PublishingDetail>
    <ProductSupply><SupplyDetail><Price><PriceAmount>12.50</PriceAmount><CurrencyCode>USD</CurrencyCode></Price><Price><PriceAmount>11.99</PriceAmount><CurrencyCode>EUR</CurrencyCode></Price></SupplyDetail></ProductSupply>
  </Product></ONIXMessage>`;
  const { books, errors } = feedToBooks('onix', onix, known);
  assert.deepEqual(errors, []);
  const [book] = books;
  assert.equal(book!.title, 'Echoes & Stars');
  assert.equal(book!.subtitle, 'A Novel');
  assert.equal(book!.format, 'audiobook');
  assert.equal(book!.narrator, 'Nia Voice');
  assert.equal(book!.language, 'Dutch');
  assert.equal(book!.audioDurationMinutes, 420);
  assert.equal(book!.price, 11.99, 'the euro price is preferred');
  assert.equal(book!.synopsis, 'A bold story.');
  assert.equal(book!.publishDate, '2026-03-01');
  assert.equal(book!.coverImage, 'https://covers.example/x1.jpg');
  assert.equal(feedToBooks('onix', '<!DOCTYPE x [<!ENTITY a "b">]><ONIXMessage/>', known).errors[0]!.reason, 'Entity declarations are not accepted.');
});

/** Clear verified account state only after the identity provider ends the session. */
export async function completeSignOut(
  endSession: () => Promise<unknown>,
  clearAccount: () => void,
  showFailure: () => void,
): Promise<void> {
  try {
    await endSession();
    clearAccount();
  } catch {
    showFailure();
  }
}

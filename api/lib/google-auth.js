const { google } = require('googleapis');

/**
 * Mendapatkan autentikasi Google Service Account
 *
 * Untuk keamanan, `GOOGLE_SERVICE_ACCOUNT_JSON` harus diset di Vercel Dashboard.
 * Pastikan JSON tersebut valid.
 */
async function getGoogleAuth() {
  const jsonStr = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!jsonStr) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable is missing.');
  }

  let credentials;
  try {
    credentials = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not a valid JSON: ' + e.message);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  });

  return auth;
}

module.exports = { getGoogleAuth };

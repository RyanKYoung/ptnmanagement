// ============================================================
// PTN Management — Google Apps Script
//
// SETUP (one time):
//   1. Paste this file into script.google.com
//   2. Deploy → New Deployment → Web App
//        Execute as: Me
//        Who has access: Anyone
//   3. Authorize Gmail + Sheets access when prompted
//
// HOW IT WORKS:
//   - doPost fires automatically every time the website form
//     is submitted — no trigger setup needed for that.
//   - checkIncomingReplies is OPTIONAL: set a 15-min time
//     trigger only if you want replies to your auto-reply
//     email logged back into the sheet automatically.
// ============================================================

var SHEET_ID   = '1hYmPwbsipdIkz34VSmrLskA7HHxBuxx_x5spRfhOaG4';
var SHEET_NAME = 'PTN';
var FROM_EMAIL = 'Ryan@ptnmanagement.com';
var FROM_NAME  = 'Ryan | PTN Management';

// ------------------------------------------------------------
// doPost — receives form submissions from the website
// ------------------------------------------------------------
function doPost(e) {
  try {
    var params  = e.parameter;
    var name    = (params.name    || '').trim();
    var email   = (params.email   || '').trim();
    var company = (params.company || '').trim();
    var message = (params.message || '').trim();

    // Write to Google Sheet
    writeToSheet_(name, email, company, message);

    // Send auto-reply to the prospect
    if (email) {
      sendAutoReply_(name, email, company);
    }

    // Notify Ryan
    notifyRyan_(name, email, company, message);

    return jsonResponse_({ result: 'success' });
  } catch (err) {
    Logger.log('doPost error: ' + err);
    return jsonResponse_({ result: 'error', message: err.toString() });
  }
}

// ------------------------------------------------------------
// doGet — health check (visit the URL to confirm it's live)
// ------------------------------------------------------------
function doGet() {
  return ContentService
    .createTextOutput('PTN Management form handler is live.')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ------------------------------------------------------------
// writeToSheet_ — appends a row to the PTN sheet
// ------------------------------------------------------------
function writeToSheet_(name, email, company, message) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);

  // Create sheet + header row if it doesn't exist yet
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Timestamp', 'Name', 'Email', 'Company', 'Message', 'Status', 'Notes']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    new Date(),
    name,
    email,
    company,
    message,
    'New',   // Status — update manually in the sheet as you work leads
    ''       // Notes — for your own use
  ]);
}

// ------------------------------------------------------------
// sendAutoReply_ — sends a reply to the prospect
// ------------------------------------------------------------
function sendAutoReply_(name, email, company) {
  var firstName = name.split(' ')[0] || name;

  var subject = 'Thanks for reaching out — PTN Management';

  var body =
    'Hi ' + firstName + ',\n\n' +
    'Thanks for getting in touch! We got your message and will be back ' +
    'with you within one business day.\n\n' +
    'In the meantime, if anything is time-sensitive, feel free to reply ' +
    'directly to this email.\n\n' +
    'Talk soon,\n' +
    'Ryan\n' +
    'PTN Management\n' +
    'Ryan@ptnmanagement.com';

  var htmlBody =
    '<p>Hi ' + firstName + ',</p>' +
    '<p>Thanks for getting in touch! We got your message and will be back ' +
    'with you within one business day.</p>' +
    '<p>In the meantime, if anything is time-sensitive, feel free to reply ' +
    'directly to this email.</p>' +
    '<p>Talk soon,<br>' +
    '<strong>Ryan</strong><br>' +
    'PTN Management<br>' +
    '<a href="mailto:Ryan@ptnmanagement.com">Ryan@ptnmanagement.com</a></p>';

  GmailApp.sendEmail(email, subject, body, {
    from:     FROM_EMAIL,
    name:     FROM_NAME,
    replyTo:  FROM_EMAIL,
    htmlBody: htmlBody
  });
}

// ------------------------------------------------------------
// notifyRyan_ — internal alert so nothing slips through
// ------------------------------------------------------------
function notifyRyan_(name, email, company, message) {
  var subject = '🔔 New PTN Contact: ' + name + (company ? ' (' + company + ')' : '');

  var body =
    'New form submission on ptnmanagement.com\n\n' +
    'Name:    ' + name    + '\n' +
    'Email:   ' + email   + '\n' +
    'Company: ' + company + '\n\n' +
    'Message:\n' + message + '\n\n' +
    'Open sheet: https://docs.google.com/spreadsheets/d/' + SHEET_ID;

  GmailApp.sendEmail(FROM_EMAIL, subject, body, {
    from:    FROM_EMAIL,
    name:    FROM_NAME,
    replyTo: email || FROM_EMAIL
  });
}

// ------------------------------------------------------------
// checkIncomingReplies — OPTIONAL
// Catches replies to your auto-reply and logs them in the sheet.
// Only needed if you want that automated. Otherwise just read
// replies normally in Gmail.
//
// To enable: Triggers (clock icon) → Add trigger →
//   checkIncomingReplies → Time-driven → Every 15 minutes
// ------------------------------------------------------------
function checkIncomingReplies() {
  // Search for unread replies to threads containing PTN auto-reply subject
  var threads = GmailApp.search(
    'subject:"Re: Thanks for reaching out — PTN Management" is:unread',
    0, 20
  );

  if (threads.length === 0) return;

  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;

  threads.forEach(function(thread) {
    var messages = thread.getMessages();
    // The last message in the thread is the reply
    var reply = messages[messages.length - 1];

    if (reply.isUnread()) {
      var replyFrom    = reply.getFrom();
      var replyDate    = reply.getDate();
      var replySnippet = reply.getPlainBody().substring(0, 300);

      // Find the matching row in the sheet by email address
      var data      = sheet.getDataRange().getValues();
      var emailCol  = 2; // 0-indexed: col C = Email
      var notesCol  = 6; // 0-indexed: col G = Notes

      for (var i = 1; i < data.length; i++) {
        var rowEmail = data[i][emailCol] ? data[i][emailCol].toLowerCase() : '';
        if (replyFrom.toLowerCase().indexOf(rowEmail) !== -1 && rowEmail !== '') {
          // Append reply snippet to Notes column
          var existing = data[i][notesCol] ? data[i][notesCol] + '\n---\n' : '';
          sheet.getRange(i + 1, notesCol + 1).setValue(
            existing + '[Reply ' + replyDate.toLocaleDateString() + ']: ' + replySnippet
          );
          // Update status
          sheet.getRange(i + 1, 6).setValue('Replied');
          break;
        }
      }

      // Mark as read so we don't process it again
      reply.markRead();
    }
  });
}

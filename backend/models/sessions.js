// backend/models/sessions.js

const sessionCache = {};

function setSession(user, state) {
  sessionCache[user] = state;
}

function getSession(user) {
  return sessionCache[user] || null;
}

function clearSession(user) {
  delete sessionCache[user];
}

module.exports = { setSession, getSession, clearSession };

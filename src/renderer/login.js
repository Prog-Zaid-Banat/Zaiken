// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
'use strict';

window.addEventListener('DOMContentLoaded', function () {
  var authScreen = document.getElementById('auth-screen');
  var emailInput = document.getElementById('auth-email');
  var passwordInput = document.getElementById('auth-password');
  var loginBtn = document.getElementById('btn-login');
  var errorBox = document.getElementById('auth-error');
  var titleEl = document.getElementById('auth-title');
  var toggleText = document.getElementById('auth-toggle-text');
  var toggleLink = document.getElementById('auth-toggle-link');

  var mode = 'login'; // 'login' | 'register'

  function showError(message) {
    errorBox.textContent = message;
    errorBox.style.display = 'block';
  }

  function clearError() {
    errorBox.style.display = 'none';
    errorBox.textContent = '';
  }

  function setMode(next) {
    mode = next;
    clearError();
    if (mode === 'register') {
      titleEl.textContent = 'Create your Zaiken account';
      loginBtn.textContent = 'Register';
      toggleText.textContent = 'Already have an account?';
      toggleLink.textContent = 'Login';
    } else {
      titleEl.textContent = 'Zaiken Login';
      loginBtn.textContent = 'Login';
      toggleText.textContent = "Don't have an account?";
      toggleLink.textContent = 'Register';
    }
  }

  function enterApp() {
    authScreen.style.display = 'none';
    App.init();
  }

  async function submit() {
    clearError();
    var email = (emailInput.value || '').trim();
    var password = passwordInput.value || '';

    loginBtn.disabled = true;
    var originalLabel = loginBtn.textContent;
    loginBtn.textContent = mode === 'register' ? 'Creating account…' : 'Logging in…';

    try {
      if (mode === 'register') {
        await window.zaiken.auth.register(email, password);
      } else {
        await window.zaiken.auth.login(email, password);
      }
      enterApp();
    } catch (e) {
      var msg = (e && (e.message || e)) || 'Something went wrong. Please try again.';
      if (typeof msg !== 'string') msg = 'Something went wrong. Please try again.';
      // Electron may prefix Error: 
      msg = String(msg).replace(/^Error:\s*/i, '');
      showError(msg);
      loginBtn.disabled = false;
      loginBtn.textContent = originalLabel;
    }
  }

  loginBtn.addEventListener('click', submit);
  passwordInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') submit();
  });
  toggleLink.addEventListener('click', function (e) {
    e.preventDefault();
    setMode(mode === 'login' ? 'register' : 'login');
  });

  // If a session already exists from a previous run, skip straight to the app.
  window.zaiken.auth.getCurrentUser().then(function (user) {
    if (user) {
      enterApp();
    } else {
      authScreen.style.display = 'flex';
    }
  }).catch(function () {
    authScreen.style.display = 'flex';
  });
});

document.addEventListener('DOMContentLoaded', () => {
    if (IS_DEV) {
    handleDevMode();
  }

    auth.initialize();
  auth.subscribe(handleAuthStateChange);

    setupEventListeners();

    dashboard.initialize();
});

function handleDevMode() {
  const apiHost = new URL(API_BASE_URL).host;
  log(`API endpoint set to: ${API_BASE_URL}`);

    const devIndicator = document.createElement('div');
  devIndicator.style.position = 'fixed';
  devIndicator.style.bottom = '10px';
  devIndicator.style.right = '10px';
  devIndicator.style.padding = '5px 10px';
  devIndicator.style.background = '#f0f0f0';
  devIndicator.style.border = '1px solid #ccc';
  devIndicator.style.borderRadius = '4px';
  devIndicator.style.fontSize = '12px';
  devIndicator.textContent = `Dev Mode (API: ${apiHost})`;
  document.body.appendChild(devIndicator);
}

function handleAuthStateChange(state) {
  const {
    isAuthenticated,
    loading,
    isAdmin,
    isVerified,
    member,
    error
  } = state;

  const loadingMessage = document.getElementById('loading-message');
  const loggedOutView = document.getElementById('logged-out-view');
  const loggedInView = document.getElementById('logged-in-view');
  const loginForm = document.getElementById('login-form');
  const dashboardView = document.getElementById('dashboard');
  const accessDeniedView = document.getElementById('access-denied');

    if (loading) {
    loadingMessage.style.display = 'block';
    loggedOutView.style.display = 'none';
    loggedInView.style.display = 'none';
    loginForm.style.display = 'none';
    dashboardView.style.display = 'none';
    accessDeniedView.style.display = 'none';
    return;
  } else {
    loadingMessage.style.display = 'none';
  }

    if (isAuthenticated && member) {
        loggedOutView.style.display = 'none';
    loggedInView.style.display = 'block';
    loginForm.style.display = 'none';

        document.getElementById('username').textContent = member.username;
    document.getElementById('admin-badge').style.display = isAdmin ? 'inline-block' : 'none';
    document.getElementById('verified-badge').style.display = isVerified ? 'inline-block' : 'none';

        if (isVerified) {
      dashboardView.style.display = 'block';
      accessDeniedView.style.display = 'none';

            dashboard.loadDashboard();
    } else {
      dashboardView.style.display = 'none';
      accessDeniedView.style.display = 'block';
    }
  } else {
        loggedOutView.style.display = 'block';
    loggedInView.style.display = 'none';
    dashboardView.style.display = 'none';
    accessDeniedView.style.display = 'none';
  }

    const loginError = document.getElementById('login-error');

  if (error) {
    loginError.textContent = error;
  } else {
    loginError.textContent = '';
  }
}

function setupEventListeners() {
    document.getElementById('show-login-btn').addEventListener('click', () => {
    document.getElementById('login-form').style.display = 'block';
    auth.clearError();
  });

    document.querySelector('.cancel-btn').addEventListener('click', () => {
    document.getElementById('login-form').style.display = 'none';
    auth.clearError();
  });

    document.getElementById('logout-btn').addEventListener('click', async () => {
    await auth.logout();
  });

    document.getElementById('login').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    await auth.login(username, password);
  });
}
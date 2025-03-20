document.addEventListener('DOMContentLoaded', () => {
  // Add development mode indicator if needed
  if (IS_DEV) {
    handleDevMode();
  }

  // Initialize authentication
  auth.initialize();
  auth.subscribe(handleAuthStateChange);

  // Set up UI event listeners
  setupEventListeners();

  // Initialize dashboard
  dashboard.initialize();
});

// Special handling for development mode
function handleDevMode() {
  const apiHost = new URL(API_BASE_URL).host;
  log(`API endpoint set to: ${API_BASE_URL}`);

  // Add development mode indicator
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

  // Handle loading state
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

  // Handle authentication state
  if (isAuthenticated && member) {
    // Show logged in view
    loggedOutView.style.display = 'none';
    loggedInView.style.display = 'block';
    loginForm.style.display = 'none';

    // Update user info display
    document.getElementById('username').textContent = member.username;
    document.getElementById('admin-badge').style.display = isAdmin ? 'inline-block' : 'none';
    document.getElementById('verified-badge').style.display = isVerified ? 'inline-block' : 'none';

    // Show dashboard only for verified users
    if (isVerified) {
      dashboardView.style.display = 'block';
      accessDeniedView.style.display = 'none';

      // Load dashboard data if not already loaded
      dashboard.loadDashboard();
    } else {
      dashboardView.style.display = 'none';
      accessDeniedView.style.display = 'block';
    }
  } else {
    // Show logged out view
    loggedOutView.style.display = 'block';
    loggedInView.style.display = 'none';
    dashboardView.style.display = 'none';
    accessDeniedView.style.display = 'none';
  }

  // Display any errors
  const loginError = document.getElementById('login-error');

  if (error) {
    loginError.textContent = error;
  } else {
    loginError.textContent = '';
  }
}

function setupEventListeners() {
  // Show login form button
  document.getElementById('show-login-btn').addEventListener('click', () => {
    document.getElementById('login-form').style.display = 'block';
    auth.clearError();
  });

  // Cancel button
  document.querySelector('.cancel-btn').addEventListener('click', () => {
    document.getElementById('login-form').style.display = 'none';
    auth.clearError();
  });

  // Logout button
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await auth.logout();
  });

  // Login form submission
  document.getElementById('login').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    await auth.login(username, password);
  });
}
document.addEventListener('DOMContentLoaded', () => {
  // Role Selection State
  const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '') 
    ? 'http://127.0.0.1:8000' 
    : ''; // Render will inject this or we can detect it

  let selectedRole = 'voter'; // Default to voter

  // Role Button Elements
  const voterRoleBtn = document.getElementById('voterRoleBtn');
  const adminRoleBtn = document.getElementById('adminRoleBtn');
  const idLabel = document.getElementById('idLabel');
  const roleText = document.getElementById('roleText');
  const voterIdInput = document.getElementById('voter-id');

  // Role Selection Handlers
  function selectRole(role) {
    selectedRole = role;

    // Update button states
    if (role === 'voter') {
      voterRoleBtn.classList.add('active');
      adminRoleBtn.classList.remove('active');
      idLabel.textContent = 'Voter ID';
      roleText.textContent = 'Voter';
      voterIdInput.placeholder = 'Enter your Voter ID';
    } else {
      adminRoleBtn.classList.add('active');
      voterRoleBtn.classList.remove('active');
      idLabel.textContent = 'Admin ID';
      roleText.textContent = 'Admin';
      voterIdInput.placeholder = 'Enter your Admin ID';
    }
  }

  // Role button click handlers
  if (voterRoleBtn) voterRoleBtn.addEventListener('click', () => selectRole('voter'));
  if (adminRoleBtn) adminRoleBtn.addEventListener('click', () => selectRole('admin'));

  // Password Toggle Functionality
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');

  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent any accidental form submission
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);

      // Toggle icon
      const icon = togglePassword.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
      }
    });
  }

  // Error Display Functions
  function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    if (errorText) errorText.textContent = message;
    if (errorDiv) {
      errorDiv.style.display = 'flex';
      // Auto-hide after 5 seconds
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 5000);
    }
  }

  function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) errorDiv.style.display = 'none';
  }

  // Login Form Handler
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const credentialsSection = document.getElementById('credentialsSection');
  const otpSection = document.getElementById('otpSection');
  const otpInstruction = document.getElementById('otpInstruction');

  let isOtpStep = false;
  let currentVoterId = '';

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      hideError();

      const voter_id = document.getElementById('voter-id').value.trim();
      const password = document.getElementById('password').value;
      const otpCode = document.getElementById('otp').value.trim();

      if (loginBtn) {
        loginBtn.classList.add('loading');
        loginBtn.disabled = true;
      }

      try {
        if (!isOtpStep) {
          // Step 1: Initial Login
          if (!voter_id || !password) {
            throw new Error('Please enter both ID and Password');
          }

          const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voter_id, password })
          });

          const data = await response.json();
          if (response.ok) {
            currentVoterId = voter_id;
            // Automatically send email OTP
            await sendOtpToUser('email');
          } else {
            throw new Error(data.detail || 'Login failed');
          }
        } else {
          // Step 2: OTP Verification
          if (!otpCode || otpCode.length !== 6) {
            throw new Error('Please enter a valid 6-digit OTP');
          }

          const response = await fetch(`${API_URL}/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voter_id: currentVoterId, otp: otpCode })
          });

          const data = await response.json();
          if (response.ok) {
            const backendRole = data.role === 'user' ? 'voter' : data.role;
            if (backendRole !== selectedRole) {
              throw new Error(`You cannot login as ${selectedRole === 'admin' ? 'Admin' : 'Voter'} with ${backendRole === 'admin' ? 'Admin' : 'Voter'} credentials.`);
            }

            if (loginBtn) {
              loginBtn.classList.remove('loading');
              loginBtn.classList.add('success');
            }

            setTimeout(() => {
              if (data.role === 'admin') {
                localStorage.setItem('jwtTokenAdmin', data.token);
                window.location.replace(`admin.html?Authorization=Bearer ${data.token}`);
              } else {
                localStorage.setItem('jwtTokenVoter', data.token);
                window.location.replace(`index.html?Authorization=Bearer ${data.token}`);
              }
            }, 500);
          } else {
            throw new Error(data.detail || 'OTP verification failed');
          }
        }
      } catch (error) {
        console.error('Login error:', error.message);
        if (loginBtn) {
          loginBtn.classList.remove('loading');
          loginBtn.disabled = false;
        }
        showError(error.message);
      }
    });
  }

  async function sendOtpToUser(method) {
    try {
      const response = await fetch(`${API_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: currentVoterId, method })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to send OTP');

      // Transition to OTP Input
      if (credentialsSection) credentialsSection.style.display = 'none';
      if (otpSection) otpSection.style.display = 'block';
      isOtpStep = true;
      
      if (otpInstruction) {
        otpInstruction.textContent = `A 6-digit code has been sent to your email.`;
      }

      // Demo Mode: Log the OTP to console if returned by backend
      if (data.debug_otp) {
        console.log("%c[DEMO MODE] OTP Code: " + data.debug_otp, "color: #FBBF24; font-weight: bold; font-size: 14px; background: rgba(251, 191, 36, 0.1); padding: 5px; border-radius: 4px;");
        console.log("Check this console whenever you need the OTP for demonstration.");
      }
      if (loginBtn) {
        const btnText = loginBtn.querySelector('.btn-text');
        if (btnText) btnText.textContent = 'Verify OTP';
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
      }
      const otpInput = document.getElementById('otp');
      if (otpInput) otpInput.required = true;
    } catch (error) {
      throw error;
    }
  }
});


/**
 * Authentication Module
 * Handles user authentication and session management
 */

const Auth = {
  currentUser: null,

  /**
   * Initialize authentication
   */
  init() {
    this.checkSession();
  },

  /**
   * Check for existing session
   */
  checkSession() {
    const session = localStorage.getItem('session');
    if (session) {
      try {
        this.currentUser = JSON.parse(session);
        return true;
      } catch (e) {
        this.logout();
        return false;
      }
    }
    return false;
  },

  /**
   * Save session
   */
  saveSession(user) {
    this.currentUser = user;
    localStorage.setItem('session', JSON.stringify(user));
  },

  /**
   * Caregiver signup
   */
  async caregiverSignup(email, name, password, passwordConfirm) {
    // Validation
    if (!email || !name || !password) {
      return { success: false, message: 'Please fill all fields' };
    }

    if (!this.validateEmail(email)) {
      return { success: false, message: 'Invalid email format' };
    }

    if (password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters' };
    }

    if (password !== passwordConfirm) {
      return { success: false, message: 'Passwords do not match' };
    }

    // Create user
    const result = await DB.createUser({
      role: 'caregiver',
      email: email,
      name: name,
      password: password,
      isPaid: false
    });

    return result;
  },

  /**
   * Caregiver login
   */
  async caregiverLogin(email, password) {
    if (!email || !password) {
      return { success: false, message: 'Please enter email and password' };
    }

    const result = await DB.authenticateUser(email, password);

    if (result.success && result.user.role === 'caregiver') {
      this.saveSession(result.user);
      return { success: true, user: result.user };
    }

    return { success: false, message: 'Invalid caregiver credentials' };
  },

  /**
   * Patient login
   */
  async patientLogin(email, password) {
    if (!email || !password) {
      return { success: false, message: 'Please enter email and password' };
    }

    const result = await DB.authenticateUser(email, password);

    if (result.success && result.user.role === 'patient') {
      this.saveSession(result.user);
      return { success: true, user: result.user };
    }

    return { success: false, message: 'Invalid patient credentials' };
  },

  /**
   * Logout
   */
  logout() {
    this.currentUser = null;
    localStorage.removeItem('session');
  },

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  },

  /**
   * Validate email format
   */
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
};
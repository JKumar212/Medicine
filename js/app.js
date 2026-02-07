/**
 * Main Application Controller
 * Handles UI navigation and initialization
 */

const App = {
  /**
   * Initialize application
   */
  init() {
    console.log('Medicine Reminder App - Initializing...');

    // Initialize database
    DB.initDB().catch(err => console.error('DB init error:', err));

    // Initialize authentication
    Auth.init();

    // Setup event listeners
    this.setupEventListeners();

    // Check for existing session and route accordingly
    if (Auth.checkSession()) {
      const user = Auth.getCurrentUser();
      if (user.role === 'caregiver') {
        this.showScreen('caregiverDashboard');
        Caregiver.init();
      } else if (user.role === 'patient') {
        this.showScreen('patientDashboard');
        Patient.init();
      }
    } else {
      this.showScreen('roleScreen');
    }
  },

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Role selection
    document.getElementById('btnCaregiver')?.addEventListener('click', () => {
      this.showScreen('caregiverLoginScreen');
    });

    document.getElementById('btnPatient')?.addEventListener('click', () => {
      this.showScreen('patientLoginScreen');
    });

    // Caregiver auth
    document.getElementById('btnGoToSignup')?.addEventListener('click', () => {
      this.showScreen('caregiverSignupScreen');
    });

    document.getElementById('btnGoToLogin')?.addEventListener('click', () => {
      this.showScreen('caregiverLoginScreen');
    });

    document.getElementById('btnCaregiverSignup')?.addEventListener('click', () => {
      this.handleCaregiverSignup();
    });

    document.getElementById('btnCaregiverLogin')?.addEventListener('click', () => {
      this.handleCaregiverLogin();
    });

    // Patient auth
    document.getElementById('btnPatientLogin')?.addEventListener('click', () => {
      this.handlePatientLogin();
    });

    // Caregiver dashboard
    document.getElementById('btnAddPatient')?.addEventListener('click', () => {
      this.showScreen('createPatientScreen');
    });

    document.getElementById('btnAddMedicine')?.addEventListener('click', () => {
      Caregiver.cancelEdit(); // Reset any edit mode
      this.showScreen('addMedicineScreen');
      Caregiver.loadPatients();
    });

    document.getElementById('btnViewPatients')?.addEventListener('click', () => {
      this.showScreen('viewPatientsScreen');
      Caregiver.viewPatients();
    });

    document.getElementById('btnWeeklyReport')?.addEventListener('click', () => {
      this.showScreen('weeklyReportScreen');
      Caregiver.loadWeeklyReport();
    });

    document.getElementById('btnCaregiverLogout')?.addEventListener('click', () => {
      this.handleLogout();
    });

    // Create patient
    document.getElementById('btnCreatePatient')?.addEventListener('click', () => {
      this.handleCreatePatient();
    });

    // Medicine management
    document.getElementById('scheduleType')?.addEventListener('change', () => {
      Caregiver.toggleScheduleType();
    });

    document.getElementById('instructionsType')?.addEventListener('change', () => {
      Caregiver.toggleInstructionsType();
    });

    document.getElementById('recordBtn')?.addEventListener('click', () => {
      Caregiver.toggleRecording();
    });

    document.getElementById('playBtn')?.addEventListener('click', () => {
      Caregiver.playRecording();
    });

    document.getElementById('deleteBtn')?.addEventListener('click', () => {
      Caregiver.deleteRecording();
    });

    document.getElementById('btnSaveMedicine')?.addEventListener('click', () => {
      this.handleSaveMedicine();
    });

    document.getElementById('btnCancelEdit')?.addEventListener('click', () => {
      Caregiver.cancelEdit();
      App.showAlert('addMedicineAlert', 'Edit cancelled', 'info');
    });

    // Patient dashboard
    document.getElementById('btnPatientLogout')?.addEventListener('click', () => {
      this.handleLogout();
    });

    document.getElementById('btnTaken')?.addEventListener('click', () => {
      Patient.markAsTaken();
    });

    // Back navigation
    document.getElementById('backFromCaregiverLogin')?.addEventListener('click', () => {
      this.showScreen('roleScreen');
    });

    document.getElementById('backFromSignup')?.addEventListener('click', () => {
      this.showScreen('roleScreen');
    });

    document.getElementById('backFromPatientLogin')?.addEventListener('click', () => {
      this.showScreen('roleScreen');
    });

    document.getElementById('backToDashboardFromPatient')?.addEventListener('click', () => {
      this.showScreen('caregiverDashboard');
    });

    document.getElementById('backToDashboardFromViewPatients')?.addEventListener('click', () => {
      this.showScreen('caregiverDashboard');
    });

    document.getElementById('backToDashboardFromMedicine')?.addEventListener('click', () => {
      Caregiver.cancelEdit(); // Reset any edit mode
      this.showScreen('caregiverDashboard');
    });

    document.getElementById('backToDashboardFromReport')?.addEventListener('click', () => {
      this.showScreen('caregiverDashboard');
    });

    // Enter key handlers
    this.setupEnterKeyHandlers();
  },

  /**
   * Setup Enter key handlers for forms
   */
  setupEnterKeyHandlers() {
    const handleEnter = (event, callback) => {
      if (event.key === 'Enter') {
        callback();
      }
    };

    document.getElementById('caregiverLoginPassword')?.addEventListener('keypress', (e) => {
      handleEnter(e, () => this.handleCaregiverLogin());
    });

    document.getElementById('caregiverSignupPasswordConfirm')?.addEventListener('keypress', (e) => {
      handleEnter(e, () => this.handleCaregiverSignup());
    });

    document.getElementById('patientLoginPassword')?.addEventListener('keypress', (e) => {
      handleEnter(e, () => this.handlePatientLogin());
    });

    document.getElementById('patientPasswordConfirm')?.addEventListener('keypress', (e) => {
      handleEnter(e, () => this.handleCreatePatient());
    });
  },

  /**
   * Show specific screen
   */
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.add('active');
      
      // Scroll to top
      document.querySelector('.container').scrollTop = 0;
    }
  },

  /**
   * Show alert message
   */
  showAlert(elementId, message, type = 'success') {
    const alertEl = document.getElementById(elementId);
    if (alertEl) {
      alertEl.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
      
      setTimeout(() => {
        alertEl.innerHTML = '';
      }, 5000);
    }
  },

  /**
   * Handle caregiver signup
   */
  async handleCaregiverSignup() {
    const email = document.getElementById('caregiverSignupEmail').value.trim();
    const name = document.getElementById('caregiverSignupName').value.trim();
    const password = document.getElementById('caregiverSignupPassword').value;
    const passwordConfirm = document.getElementById('caregiverSignupPasswordConfirm').value;

    this.showAlert('caregiverSignupAlert', 'Creating account...', 'info');

    const result = await Auth.caregiverSignup(email, name, password, passwordConfirm);

    if (result.success) {
      this.showAlert('caregiverSignupAlert', result.message, 'success');
      
      setTimeout(() => {
        document.getElementById('caregiverSignupEmail').value = '';
        document.getElementById('caregiverSignupName').value = '';
        document.getElementById('caregiverSignupPassword').value = '';
        document.getElementById('caregiverSignupPasswordConfirm').value = '';
        this.showScreen('caregiverLoginScreen');
      }, 1500);
    } else {
      this.showAlert('caregiverSignupAlert', result.message, 'error');
    }
  },

  /**
   * Handle caregiver login
   */
  async handleCaregiverLogin() {
    const email = document.getElementById('caregiverLoginEmail').value.trim();
    const password = document.getElementById('caregiverLoginPassword').value;

    this.showAlert('caregiverLoginAlert', 'Logging in...', 'info');

    const result = await Auth.caregiverLogin(email, password);

    if (result.success) {
      this.showScreen('caregiverDashboard');
      Caregiver.init();
    } else {
      this.showAlert('caregiverLoginAlert', result.message, 'error');
    }
  },

  /**
   * Handle patient login
   */
  async handlePatientLogin() {
    const email = document.getElementById('patientLoginEmail').value.trim();
    const password = document.getElementById('patientLoginPassword').value;

    this.showAlert('patientLoginAlert', 'Logging in...', 'info');

    const result = await Auth.patientLogin(email, password);

    if (result.success) {
      this.showScreen('patientDashboard');
      Patient.init();
    } else {
      this.showAlert('patientLoginAlert', result.message, 'error');
    }
  },

  /**
   * Handle create patient
   */
  async handleCreatePatient() {
    const email = document.getElementById('patientEmail').value.trim();
    const name = document.getElementById('patientName').value.trim();
    const password = document.getElementById('patientPassword').value;
    const passwordConfirm = document.getElementById('patientPasswordConfirm').value;

    this.showAlert('createPatientAlert', 'Creating patient account...', 'info');

    const result = await Caregiver.createPatient(email, name, password, passwordConfirm);

    if (result.success) {
      this.showAlert('createPatientAlert', result.message, 'success');
      
      document.getElementById('patientEmail').value = '';
      document.getElementById('patientName').value = '';
      document.getElementById('patientPassword').value = '';
      document.getElementById('patientPasswordConfirm').value = '';
    } else {
      this.showAlert('createPatientAlert', result.message, 'error');
    }
  },

  /**
   * Handle save medicine
   */
  async handleSaveMedicine() {
    const patientEmail = document.getElementById('medicinePatientSelect').value;
    const name = document.getElementById('medicineName').value.trim();
    const time = document.getElementById('medicineTime').value;
    const stock = document.getElementById('medicineStock').value;
    const instructionsType = document.getElementById('instructionsType').value;

    const isEditing = Caregiver.editingMedicineId !== null;
    const actionText = isEditing ? 'Updating medicine...' : 'Saving medicine...';
    
    this.showAlert('addMedicineAlert', actionText, 'info');

    const result = await Caregiver.saveMedicine(patientEmail, name, time, stock, instructionsType);

    if (result.success) {
      this.showAlert('addMedicineAlert', result.message, 'success');
    } else {
      this.showAlert('addMedicineAlert', result.message, 'error');
    }
  },

  /**
   * Handle logout
   */
  handleLogout() {
    Patient.stopMonitoring();
    Auth.logout();
    this.showScreen('roleScreen');
  }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

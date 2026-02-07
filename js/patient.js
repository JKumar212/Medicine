/**
 * Patient Module
 * Handles all patient-specific functionality
 */

const Patient = {
  alertInterval: null,
  alertTimeout: null,
  currentAlert: null,
  audioElement: null,

  /**
   * Initialize patient dashboard
   */
  init() {
    const user = Auth.getCurrentUser();
    if (user && user.role === 'patient') {
      this.loadDashboard();
      this.startMonitoring();
    }
  },

  /**
   * Load patient dashboard
   */
  loadDashboard() {
    const user = Auth.getCurrentUser();
    document.getElementById('patientName').textContent = user.name;
    document.getElementById('patientEmail').textContent = user.email;

    this.loadMedicinesList();
    this.updateClock();
  },

  /**
   * Update clock display
   */
  updateClock() {
    setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
      const timeEl = document.getElementById('currentTime');
      if (timeEl) {
        timeEl.textContent = timeStr;
      }
    }, 1000);
  },

  /**
   * Load medicines list for patient
   */
  loadMedicinesList() {
    const user = Auth.getCurrentUser();
    const medicines = DB.getMedicinesByPatient(user.email);

    const listEl = document.getElementById('patientMedicinesList');

    if (medicines.length === 0) {
      listEl.innerHTML = '<div class="alert alert-info">No medicines scheduled yet. Your caregiver will add medicines for you.</div>';
      return;
    }

    listEl.innerHTML = '<h3 style="color: #667eea; margin-bottom: 15px;">My Medicines</h3>';

    // Sort by time
    medicines.sort((a, b) => a.time.localeCompare(b.time));

    medicines.forEach(medicine => {
      const medicineDiv = document.createElement('div');
      medicineDiv.className = 'medicine-item';

      const today = DB.formatDate(new Date());
      const lastTakenDate = medicine.lastTaken ? DB.formatDate(new Date(medicine.lastTaken)) : null;
      const takenToday = lastTakenDate === today;

      let statusClass = 'status-pending';
      let statusText = 'Pending';
      
      if (takenToday) {
        statusClass = 'status-taken';
        statusText = 'Taken Today ✓';
      }

      const lowStockWarning = medicine.stock <= 5 ? 
        `<p class="low-stock">⚠️ Low Stock: Only ${medicine.stock} tablets left!</p>` : '';

      medicineDiv.innerHTML = `
        <h3>${medicine.name}</h3>
        <p>🕐 Time: ${medicine.time}</p>
        <p>💊 Stock: ${medicine.stock} tablets</p>
        <p class="${statusClass}">Status: ${statusText}</p>
        ${lowStockWarning}
      `;

      listEl.appendChild(medicineDiv);
    });
  },

  /**
   * Start monitoring for medicine alerts
   */
  startMonitoring() {
    // Check immediately
    this.checkForAlert();

    // Check every minute
    this.alertInterval = setInterval(() => {
      this.checkForAlert();
    }, 60000); // 60 seconds
  },

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.alertInterval) {
      clearInterval(this.alertInterval);
      this.alertInterval = null;
    }

    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
      this.alertTimeout = null;
    }

    this.hideAlert();
  },

  /**
   * Check for medicine alert
   */
  checkForAlert() {
    const user = Auth.getCurrentUser();
    const result = DB.getNextAlert(user.email);

    if (result.success && result.alert) {
      this.showAlert(result.alert);
    }
  },

  /**
   * Show medicine alert
   */
  async showAlert(medicine) {
    this.currentAlert = medicine;

    // Update alert content
    document.getElementById('alertMedicineName').textContent = medicine.name;
    document.getElementById('alertStock').textContent = `Stock: ${medicine.stock} tablets`;

    // Handle voice or text instructions
    if (medicine.voiceFileId) {
      // Play voice instructions
      try {
        const voiceResult = await DB.getVoiceFile(medicine.voiceFileId);
        if (voiceResult.success) {
          const audioUrl = URL.createObjectURL(voiceResult.blob);
          this.audioElement = document.getElementById('voiceAudio');
          this.audioElement.src = audioUrl;
          this.audioElement.play();

          document.getElementById('voiceIndicator').style.display = 'block';
          document.getElementById('alertInstructions').textContent = '';

          // Stop after 5 minutes
          this.alertTimeout = setTimeout(() => {
            this.stopAudio();
          }, 5 * 60 * 1000); // 5 minutes
        }
      } catch (error) {
        console.error('Error playing voice:', error);
        document.getElementById('voiceIndicator').style.display = 'none';
        document.getElementById('alertInstructions').textContent = 'Please take your medicine';
      }
    } else {
      // Show text instructions
      document.getElementById('voiceIndicator').style.display = 'none';
      document.getElementById('alertInstructions').textContent = 
        medicine.instructions || 'Please take your medicine';
    }

    // Show alert overlay
    document.getElementById('patientAlert').classList.add('active');
  },

  /**
   * Hide alert
   */
  hideAlert() {
    document.getElementById('patientAlert').classList.remove('active');
    this.stopAudio();
  },

  /**
   * Stop audio playback
   */
  stopAudio() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }

    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
      this.alertTimeout = null;
    }

    document.getElementById('voiceIndicator').style.display = 'none';
  },

  /**
   * Mark medicine as taken
   */
  markAsTaken() {
    if (!this.currentAlert) return;

    const result = DB.markMedicineAsTaken(this.currentAlert.id);

    if (result.success) {
      this.hideAlert();

      // Show notification
      const alertEl = document.getElementById('patientDashboardAlert');
      
      if (result.lowStock) {
        alertEl.innerHTML = `
          <div class="alert alert-warning">
            Medicine taken! ✓<br>
            ⚠️ Low stock warning: Only ${result.stock} tablets remaining.
          </div>
        `;
      } else {
        alertEl.innerHTML = `
          <div class="alert alert-success">
            Medicine marked as taken! ✓
          </div>
        `;
      }

      setTimeout(() => {
        alertEl.innerHTML = '';
      }, 5000);

      // Refresh medicines list
      this.loadMedicinesList();
    }

    this.currentAlert = null;
  }
};
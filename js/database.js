/**
 * Database Module - Google Sheets & Drive Integration
 * Connects to Google Apps Script backend for data storage
 */

const DB = {
  /**
   * Initialize database (no-op for cloud storage, but kept for compatibility)
   */
  async initDB() {
    console.log('Using Google Sheets cloud storage');
    return Promise.resolve();
  },

  // ========== API HELPER FUNCTIONS ==========

  /**
   * Make GET request to API
   */
  async apiGet(action, params = {}) {
    const url = new URL(CONFIG.API_URL);
    url.searchParams.append('action', action);
    
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API GET Error:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Make POST request to API
   */
  async apiPost(action, data = {}) {
    const url = `${CONFIG.API_URL}?action=${action}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API POST Error:', error);
      return { success: false, message: error.message };
    }
  },

  // ========== USER MANAGEMENT ==========

  /**
   * Get all users (for local caching if needed)
   */
  async getUsers() {
    return await this.apiGet('getUsers');
  },

  /**
   * Hash password using SHA-256
   */
  async hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Create new user
   */
  async createUser(userData) {
    // Hash password
    const passwordHash = await this.hashPassword(userData.password);

    const result = await this.apiPost('createUser', {
      role: userData.role,
      email: userData.email,
      name: userData.name,
      passwordHash: passwordHash,
      caregiverEmail: userData.caregiverEmail || null,
      isPaid: userData.isPaid || false
    });

    return result;
  },

  /**
   * Authenticate user
   */
  async authenticateUser(email, password) {
    const passwordHash = await this.hashPassword(password);

    const result = await this.apiPost('authenticateUser', {
      email: email,
      passwordHash: passwordHash
    });

    return result;
  },

  /**
   * Get patients for a specific caregiver
   */
  async getPatientsByCaregiver(caregiverEmail) {
    const result = await this.apiGet('getPatientsByCaregiver', { caregiverEmail });
    return result || [];
  },

  // ========== MEDICINE MANAGEMENT ==========

  /**
   * Get all medicines
   */
  async getMedicines() {
    const result = await this.apiGet('getMedicines');
    return result || [];
  },

  /**
   * Get medicine by ID
   */
  async getMedicineById(medicineId) {
    const result = await this.apiGet('getMedicineById', { medicineId });
    return result;
  },

  /**
   * Add new medicine
   */
  async addMedicine(medicineData) {
    const result = await this.apiPost('addMedicine', {
      patientEmail: medicineData.patientEmail,
      caregiverEmail: medicineData.caregiverEmail,
      name: medicineData.name,
      time: medicineData.time,
      stock: parseInt(medicineData.stock),
      instructions: medicineData.instructions || '',
      voiceFileId: medicineData.voiceFileId || null,
      isPaid: medicineData.isPaid || false,
      scheduleType: medicineData.scheduleType || 'daily',
      selectedDays: medicineData.selectedDays || [],
      customDates: medicineData.customDates || [],
      oneTimeDate: medicineData.oneTimeDate || null
    });

    return result;
  },

  /**
   * Update existing medicine
   */
  async updateMedicine(medicineId, medicineData) {
    const result = await this.apiPost('updateMedicine', {
      medicineId: medicineId,
      name: medicineData.name,
      time: medicineData.time,
      stock: parseInt(medicineData.stock),
      instructions: medicineData.instructions || '',
      voiceFileId: medicineData.voiceFileId,
      scheduleType: medicineData.scheduleType || 'daily',
      selectedDays: medicineData.selectedDays || [],
      customDates: medicineData.customDates || [],
      oneTimeDate: medicineData.oneTimeDate || null
    });

    return result;
  },

  /**
   * Delete medicine
   */
  async deleteMedicine(medicineId) {
    const result = await this.apiPost('deleteMedicine', {
      medicineId: medicineId
    });

    return result;
  },

  /**
   * Get medicines for a specific patient
   */
  async getMedicinesByPatient(patientEmail) {
    const result = await this.apiGet('getMedicinesByPatient', { patientEmail });
    return result || [];
  },

  /**
   * Get medicines for a specific caregiver
   */
  async getMedicinesByCaregiver(caregiverEmail) {
    const result = await this.apiGet('getMedicinesByCaregiver', { caregiverEmail });
    return result || [];
  },

  /**
   * Mark medicine as taken
   */
  async markMedicineAsTaken(medicineId) {
    const result = await this.apiPost('markMedicineAsTaken', {
      medicineId: medicineId
    });

    return result;
  },

  /**
   * Check if medicine should alert today based on schedule
   */
  shouldAlertToday(medicine) {
    const now = new Date();
    const today = this.formatDate(now);
    const dayOfWeek = now.getDay();

    switch (medicine.ScheduleType) {
      case 'daily':
        return true;

      case 'specific-days':
        return medicine.SelectedDays && medicine.SelectedDays.includes(dayOfWeek);

      case 'one-time':
        return medicine.OneTimeDate === today;

      case 'custom-dates':
        return medicine.CustomDates && medicine.CustomDates.includes(today);

      default:
        return true;
    }
  },

  /**
   * Get next medicine alert for patient
   */
  async getNextAlert(patientEmail) {
    const medicines = await this.getMedicinesByPatient(patientEmail);
    const now = new Date();
    const currentTime = this.formatTime(now);
    const today = this.formatDate(now);

    for (let medicine of medicines) {
      // Check if medicine should alert today based on schedule
      if (!this.shouldAlertToday(medicine)) {
        continue;
      }

      // Check if medicine time matches current time
      if (medicine.Time === currentTime) {
        // Check if already taken today
        if (medicine.TakenDates && medicine.TakenDates.includes(today)) {
          continue;
        }

        return {
          success: true,
          alert: medicine
        };
      }
    }

    return { success: true, alert: null };
  },

  // ========== VOICE FILE MANAGEMENT ==========

  /**
   * Save voice file to Google Drive
   */
  async saveVoiceFile(blob) {
    try {
      // Convert blob to base64
      const base64Audio = await this.blobToBase64(blob);
      const fileName = `voice_${Date.now()}.webm`;

      const result = await this.apiPost('uploadVoiceFile', {
        audioBase64: base64Audio,
        fileName: fileName
      });

      return result;
    } catch (error) {
      console.error('Error saving voice file:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Get voice file from Google Drive
   */
  async getVoiceFile(fileId) {
    try {
      const result = await this.apiGet('getVoiceFile', { fileId });
      
      if (result.success) {
        // Fetch the audio file from Drive
        const response = await fetch(result.downloadUrl);
        const blob = await response.blob();
        
        return { success: true, blob: blob };
      }
      
      return result;
    } catch (error) {
      console.error('Error getting voice file:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Delete voice file from Google Drive
   */
  async deleteVoiceFile(fileId) {
    const result = await this.apiPost('deleteVoiceFile', {
      fileId: fileId
    });

    return result;
  },

  /**
   * Convert blob to base64
   */
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  // ========== REPORTS ==========

  /**
   * Get weekly report for caregiver
   */
  async getWeeklyReport(caregiverEmail) {
    const result = await this.apiGet('getWeeklyReport', { caregiverEmail });
    return result;
  },

  // ========== UTILITY FUNCTIONS ==========

  /**
   * Generate unique ID (handled by backend now)
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  /**
   * Format time as HH:mm
   */
  formatTime(date) {
    return date.toTimeString().slice(0, 5);
  },

  /**
   * Format date as YYYY-MM-DD
   */
  formatDate(date) {
    return date.toISOString().split('T')[0];
  },

  /**
   * Get day name from day number
   */
  getDayName(dayNumber) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber];
  }
};

javascript
// js/api.js

/**
 * API integration for fetching scope data
 * @module ScopeAPI
 */

import fetch from 'node-fetch';

/**
 * Represents a scope change entry
 * @typedef {Object} ScopeChange
 * @property {string} type - Type of change ('added' or 'removed')
 * @property {string} url - The URL that was added or removed
 * @property {string} date - Date of the change in ISO format
 */

/**
 * Represents a program with scope changes
 * @typedef {Object} Program
 * @property {string} id - Program ID
 * @property {string} name - Program name
 * @property {string} url - Program URL
 * @property {ScopeChange[]} scopeChanges - Array of scope changes
 */

/**
 * Represents the complete scope data
 * @typedef {Object} ScopeData
 * @property {Program[]} programs - Array of programs
 * @property {string} lastUpdated - Last updated timestamp
 */

/**
 * API integration for fetching scope data
 * @class
 */
class ScopeAPI {
  /**
   * Creates an instance of ScopeAPI
   * @constructor
   */
  constructor() {
    /** @type {string} */
    this.baseUrl = 'https://abdulsalam-create.github.io/bounty-watch';

    /** @type {ScopeData|null} */
    this.scopeData = null;

    /** @type {Date|null} */
    this.lastFetchTime = null;

    /** @type {number} */
    this.cacheDuration = 3600000; // 1 hour in milliseconds
  }

  /**
   * Validates the response from the API
   * @private
   * @param {Response} response - The response object
   * @throws {Error} If the response is not OK
   */
  _validateResponse(response) {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid content type. Expected JSON.');
    }
  }

  /**
   * Fetches scope data from the API
   * @returns {Promise<ScopeData>} The scope data
   * @throws {Error} If the fetch operation fails
   */
  async fetchScopeData() {
    try {
      const response = await fetch(`${this.baseUrl}/scope.json`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        timeout: 5000 // 5 second timeout
      });

      this._validateResponse(response);

      const data = await response.json();

      // Validate the structure of the response
      if (!data || !Array.isArray(data.programs)) {
        throw new Error('Invalid data structure received from API');
      }

      this.scopeData = data;
      this.lastFetchTime = new Date();

      return this.scopeData;
    } catch (error) {
      console.error('Error fetching scope data:', error);
      throw error;
    }
  }

  /**
   * Gets the latest scope data, fetching if needed
   * @returns {Promise<ScopeData>} The scope data
   * @throws {Error} If data cannot be retrieved
   */
  async getScopeData() {
    // If we have data and it's fresh enough, return it
    if (this.scopeData && this.lastFetchTime &&
        (new Date() - this.lastFetchTime) < this.cacheDuration) {
      return this.scopeData;
    }

    // Otherwise fetch fresh data
    return await this.fetchScopeData();
  }

  /**
   * Gets scope changes for a specific program
   * @param {string} programId - The ID of the program
   * @returns {Promise<ScopeChange[]>} Array of scope changes for the program
   * @throws {Error} If program is not found or data cannot be retrieved
   */
  async getProgramScopeChanges(programId) {
    if (!programId || typeof programId !== 'string') {
      throw new Error('Invalid program ID provided');
    }

    const data = await this.getScopeData();
    const program = data.programs.find(program => program.id === programId);

    if (!program) {
      throw new Error(`Program with ID ${programId} not found`);
    }

    return program.scopeChanges || [];
  }

  /**
   * Gets all scope changes across all programs
   * @returns {Promise<ScopeChange[]>} Array of all scope changes
   * @throws {Error} If data cannot be retrieved
   */
  async getAllScopeChanges() {
    const data = await this.getScopeData();
    return data.programs.flatMap(program => program.scopeChanges || []);
  }

  /**
   * Gets the total number of scope changes
   * @returns {Promise<number>} Total number of scope changes
   * @throws {Error} If data cannot be retrieved
   */
  async getTotalScopeChanges() {
    const changes = await this.getAllScopeChanges();
    return changes.length;
  }

  /**
   * Gets the number of programs with scope changes
   * @returns {Promise<number>} Number of programs with scope changes
   * @throws {Error} If data cannot be retrieved
   */
  async getProgramsWithChanges() {
    const data = await this.getScopeData();
    return data.programs.filter(program =>
      Array.isArray(program.scopeChanges) && program.scopeChanges.length > 0
    ).length;
  }

  /**
   * Gets the dashboard URL
   * @returns {string} The dashboard URL
   */
  getDashboardUrl() {
    return `${this.baseUrl}/scope.html`;
  }

  /**
   * Clears the cached data
   */
  clearCache() {
    this.scopeData = null;
    this.lastFetchTime = null;
  }
}

// Export the API class
export default ScopeAPI;
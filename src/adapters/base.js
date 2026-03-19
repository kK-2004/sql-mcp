/**
 * @typedef {Object} ConnectResult
 * @property {boolean} connected
 * @property {string} database
 * @property {string} version
 * @property {Object} [sshTunnel]
 */

/**
 * @typedef {Object} ColumnInfo
 * @property {string} name
 * @property {string} type
 * @property {boolean} nullable
 * @property {*} [default]
 * @property {string} [key]
 * @property {string} [extra]
 */

/**
 * @typedef {Object} SchemaResult
 * @property {string} database
 * @property {number} tableCount
 * @property {Object.<string, ColumnInfo[]>} tables
 */

/**
 * @typedef {Object} QueryResult
 * @property {Array} rows
 * @property {number} rowCount
 */

/**
 * @typedef {Object} InsertResult
 * @property {number} affectedRows
 * @property {number|null} insertId
 */

/**
 * @typedef {Object} DeleteResult
 * @property {number} affectedRows
 */

/**
 * Abstract base class for database adapters.
 * All database adapters must implement this interface.
 */
export class DatabaseAdapter {
  constructor(config) {
    this.config = config;
    if (this.constructor === DatabaseAdapter) {
      throw new Error("DatabaseAdapter is abstract and cannot be instantiated directly");
    }
  }

  /**
   * Connect to the database and verify connection.
   * @returns {Promise<ConnectResult>}
   */
  async connect() {
    throw new Error("connect() must be implemented by subclass");
  }

  /**
   * Get schema information for tables.
   * @param {string} [table] - Optional specific table name
   * @returns {Promise<SchemaResult>}
   */
  async getSchema(table) {
    throw new Error("getSchema() must be implemented by subclass");
  }

  /**
   * Execute a SELECT query.
   * @param {string} table - Table name
   * @param {string} columns - Columns to select
   * @param {Object} [where] - WHERE conditions
   * @param {Object} [orderBy] - ORDER BY clause
   * @param {number} [limit] - LIMIT
   * @returns {Promise<QueryResult>}
   */
  async query(table, columns, where, orderBy, limit) {
    throw new Error("query() must be implemented by subclass");
  }

  /**
   * Insert a row into a table.
   * @param {string} table - Table name
   * @param {Object} data - Row data
   * @returns {Promise<InsertResult>}
   */
  async insert(table, data) {
    throw new Error("insert() must be implemented by subclass");
  }

  /**
   * Delete rows from a table.
   * @param {string} table - Table name
   * @param {Object} [where] - WHERE conditions
   * @returns {Promise<DeleteResult>}
   */
  async delete(table, where) {
    throw new Error("delete() must be implemented by subclass");
  }

  /**
   * Close the database connection and cleanup resources.
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error("close() must be implemented by subclass");
  }

  /**
   * Quote an identifier with database-specific syntax.
   * @param {string} name - Identifier name
   * @returns {string}
   */
  quoteIdentifier(name) {
    throw new Error("quoteIdentifier() must be implemented by subclass");
  }

  /**
   * Get the adapter type name.
   * @returns {string}
   */
  get type() {
    throw new Error("type getter must be implemented by subclass");
  }
}

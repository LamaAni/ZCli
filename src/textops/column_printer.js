const wrap = require('./wrapping').wrap

class ColumnPrinter {
  /**
   *
   * @param {number|number[]} max_col_width When array
   * @param {number|number[]} max_col_text_length The maximal number of column
   * @param {boolean} auto_expand_last_column If true, auto expands last column if possible.
   * @param {number} terminal_width The width of the terminal. Override.
   * chars in a cell.
   * then each column would have different max widths
   */
  constructor(
    max_col_width = 50,
    max_col_text_length = 500,
    auto_expand_last_column = true,
    terminal_width = null
  ) {
    /**
     * @type {[string[]]}
     */
    this.rows = []
    this.columnSpace = '  '
    this.max_col_width = max_col_width
    this.max_col_text_length = max_col_text_length
    this.auto_expand_last_column = auto_expand_last_column
    this.terminal_width = terminal_width
  }

  /**
   * @return {string} The table.
   */
  print() {
    const get_max_width =
      /**
       * @param {[string]} row The row
       * @param {number} ci Column index.
       */
      (row, ci) => {
        return (
          (Array.isArray(this.max_col_width)
            ? this.max_col_width[ci]
            : this.max_col_width) || -1
        )
      }

    const get_col_width = (row, ci) => {
      const max_width = get_max_width(row, ci)
      const col_raw_width = (row[ci] == null ? '' : row[ci].strip).length
      if (max_width < 0 || col_raw_width < max_width) return col_raw_width
      else return max_width
    }

    /** @type {number[]} */
    const col_widths = []

    this.rows.forEach((row) => {
      row.forEach((col, ci) => {
        let col_width = get_col_width(row, ci)
        col_widths[ci] =
          col_widths[ci] == null
            ? col_width
            : col_width > col_widths[ci]
            ? col_width
            : col_widths[ci]
      })
    })

    // expanding last column
    if (this.auto_expand_last_column && process.stdout.columns > 0) {
      const total_width =
        col_widths.reduce((sum, w) => sum + w) +
        ((this.columnSpace || ' ').length - 1) * col_widths.length

      const max_cols_in_terminal = this.terminal_width || process.stdout.columns
      if (max_cols_in_terminal > total_width)
        col_widths[col_widths.length - 1] += max_cols_in_terminal - total_width
    }

    /**
     * @param {string} txt
     * @param {number} ci
     */
    const trim_to_max_col_chars = (txt, ci) => {
      const max =
        (Array.isArray(this.max_col_text_length)
          ? this.max_col_text_length[ci]
          : this.max_col_text_length) || -1
      if (max < 1) return txt
      return txt.strip.length > max ? txt.substr(0, max) : txt
    }

    // pre row processing
    const cell_rows = this.rows.map((row) =>
      row.map((col, ci) => {
        if (col_widths[ci] <= 0) return ''
        return wrap(
          trim_to_max_col_chars((col || '').toString(), ci),
          col_widths[ci]
        )
      })
    )

    // making the newline rows.
    const rows = []
    cell_rows.forEach((r) => {
      const cols = r.map((c) => (c || '').split('\n'))
      const max_count = Math.max(...cols.map((c) => c.length))
      for (let i = 0; i < max_count; i++) {
        const row = []
        for (let j = 0; j < r.length; j++) {
          row.push(cols[j][i])
        }

        rows.push(row)
      }
    })

    // padding.
    const max_cols = Math.max(...rows.map((r) => r.length))
    const clean_column = (c) => (c == null ? '' : c.toString())

    const col_width = []
    rows.forEach((r) => {
      r = r || []
      for (let i = 0; i < max_cols; i++) {
        const c = clean_column(r[i]).strip
        col_width[i] =
          col_width[i] == null || c.length > col_width[i]
            ? c.length
            : col_width[i]
      }
    })

    const lines = rows.map((r) => {
      const cols = []
      for (let i = 0; i < max_cols; i++) {
        // Filter out any empty cols.
        if (col_widths[i] <= 0) {
          continue
        }
        const c = clean_column(r[i])
        const pad_count = col_width[i] - c.strip.length
        const pad =
          pad_count <= 0 ? '' : new Array(pad_count).fill(' ').join('')
        cols.push(c + pad)
      }
      return cols.join(this.columnSpace)
    })

    return lines.join('\n')
  }

  /**
   * Sets a value to the printer.
   * @param {number} row the row
   * @param {number} col the column
   * @param {string} value the value to print.
   */
  set(row, col, value) {
    this.rows[row] = this.rows[row] || []
    this.rows[row][col] = value
  }

  /**
   * @param {string|string[]} cols
   */
  append(...cols) {
    if (Array.isArray(cols[0])) cols = cols[0]
    this.rows[this.rows.length] = Array.isArray(cols) ? cols : [cols]
  }
}

module.exports = ColumnPrinter

import { db } from "../db/openDBConnection.js";
import { parseSearchQuery } from "../util/parseSearchQuery.js";

const SUPPORTED_SORT_COLUMNS = ["age", "created_at", "gender_probability"];

export function getPaginationSettings(query = {}) {
  const requestedPage = Number.parseInt(query.page, 10);
  const requestedLimit = Number.parseInt(query.limit, 10);

  const currentPage =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const currentLimit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 50)
      : 10;
  const offset = (currentPage - 1) * currentLimit;

  return {
    currentPage,
    currentLimit,
    offset,
  };
}

export function buildSortClause(query = {}) {
  const { sort_by, order } = query;

  if (!sort_by || !SUPPORTED_SORT_COLUMNS.includes(sort_by)) {
    return null;
  }

  const normalizedOrder =
    order && ["ASC", "DESC"].includes(String(order).toUpperCase())
      ? String(order).toUpperCase()
      : "ASC";

  return ` ORDER BY ${sort_by} ${normalizedOrder}`;
}

export async function retrieveProfileDataByQueryParams(
  query,
  baseUrl = "/api/profiles",
) {
  const {
    gender,
    country_id,
    age_group,
    min_age,
    max_age,
    min_gender_probability,
    min_country_probability,
    sort_by,
  } = query;

  let sqlQuery = "SELECT * FROM profiles";
  let param = [];
  let filterConditions = [];
  let paramIndex = 1;

  // Build filter conditions
  if (country_id) {
    filterConditions.push(`country_id = $${paramIndex++}`);
    param.push(country_id.toUpperCase());
  }

  if (gender) {
    filterConditions.push(`gender = $${paramIndex++}`);
    param.push(gender.toLowerCase());
  }

  if (age_group) {
    filterConditions.push(`age_group = $${paramIndex++}`);
    param.push(age_group.toLowerCase());
  }

  if (min_age) {
    filterConditions.push(`age >= $${paramIndex++}`);
    param.push(min_age);
  }

  if (max_age) {
    filterConditions.push(`age <= $${paramIndex++}`);
    param.push(max_age);
  }

  if (min_gender_probability) {
    filterConditions.push(`gender_probability >= $${paramIndex++}`);
    param.push(min_gender_probability);
  }

  if (min_country_probability) {
    filterConditions.push(`country_probability >= $${paramIndex++}`);
    param.push(min_country_probability);
  }

  const whereClause =
    filterConditions.length > 0
      ? " WHERE " + filterConditions.join(" AND ")
      : "";
  sqlQuery += whereClause;

  // Capture filter params before appending LIMIT/OFFSET params
  const filterParams = [...param];

  if (sort_by && !SUPPORTED_SORT_COLUMNS.includes(sort_by)) {
    return {
      message: "Invalid query parameters",
    };
  }

  const sortClause = buildSortClause(query);
  if (sortClause) {
    sqlQuery += sortClause;
  }

  const { currentPage, currentLimit, offset } = getPaginationSettings(query);

  sqlQuery += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  param.push(currentLimit, offset);

  try {
    // Count only rows matching the active filters
    const countResult = await db.query(
      `SELECT COUNT(id) AS total FROM profiles${whereClause}`,
      filterParams,
    );
    const dataResult = await db.query(sqlQuery, param);

    const totalEntries = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalEntries / currentLimit);

    // Generate pagination links
    const links = generatePaginationLinks(
      baseUrl,
      currentPage,
      totalPages,
      query,
    );

    return {
      data: dataResult.rows,
      pagination: {
        currentPage: currentPage,
        pageLimit: currentLimit,
        totalEntries: totalEntries,
        totalPages: totalPages,
      },
      links: links,
      message: "successful",
    };
  } catch (err) {
    throw new Error(`Data could not be retrieved: ${err.message}`);
  }
}

export async function retrieveProfileDataForExport(query) {
  const {
    gender,
    country_id,
    age_group,
    min_age,
    max_age,
    min_gender_probability,
    min_country_probability,
    sort_by,
  } = query;

  let sqlQuery = "SELECT * FROM profiles";
  let param = [];
  let filterConditions = [];
  let paramIndex = 1;

  // Build filter conditions
  if (country_id) {
    filterConditions.push(`country_id = $${paramIndex++}`);
    param.push(country_id.toUpperCase());
  }

  if (gender) {
    filterConditions.push(`gender = $${paramIndex++}`);
    param.push(gender.toLowerCase());
  }

  if (age_group) {
    filterConditions.push(`age_group = $${paramIndex++}`);
    param.push(age_group.toLowerCase());
  }

  if (min_age) {
    filterConditions.push(`age >= $${paramIndex++}`);
    param.push(min_age);
  }

  if (max_age) {
    filterConditions.push(`age <= $${paramIndex++}`);
    param.push(max_age);
  }

  if (min_gender_probability) {
    filterConditions.push(`gender_probability >= $${paramIndex++}`);
    param.push(min_gender_probability);
  }

  if (min_country_probability) {
    filterConditions.push(`country_probability >= $${paramIndex++}`);
    param.push(min_country_probability);
  }

  if (filterConditions.length > 0) {
    sqlQuery += " WHERE " + filterConditions.join(" AND ");
  }

  if (sort_by && !SUPPORTED_SORT_COLUMNS.includes(sort_by)) {
    return {
      message: "Invalid query parameters",
    };
  }

  const sortClause = buildSortClause(query);
  if (sortClause) {
    sqlQuery += sortClause;
  }

  try {
    const dataResult = await db.query(sqlQuery, param);

    return {
      data: dataResult.rows,
      message: "successful",
    };
  } catch (err) {
    throw new Error(`Data could not be retrieved: ${err.message}`);
  }
}

export async function retrieveProfileDataBySearchParams(
  query,
  baseUrl = "/api/profiles/search",
  parsedFilters = null,
) {
  const { q, sort_by } = query;

  if (!q && !parsedFilters) {
    return { message: "Invalid query parameters" };
  }

  // Use pre-parsed filters from normalizeSearchQuery middleware when available
  // so parsing only happens once per request and the result is consistent.
  const filters = parsedFilters ?? (await parseSearchQuery(q));
  if (!filters) {
    return { message: "Unable to interpret query" };
  }

  let sqlQuery = "SELECT * FROM profiles";
  let param = [];
  let conditions = [];
  let paramIndex = 1;

  // Build SQL conditions from the canonical filter object
  if (filters.country_id) {
    conditions.push(`country_id = $${paramIndex++}`);
    param.push(filters.country_id);
  }
  if (filters.gender) {
    conditions.push(`gender = $${paramIndex++}`);
    param.push(filters.gender);
  }
  if (filters.age_group) {
    conditions.push(`age_group = $${paramIndex++}`);
    param.push(filters.age_group);
  }
  if (filters.min_age !== undefined) {
    conditions.push(`age >= $${paramIndex++}`);
    param.push(filters.min_age);
  }
  if (filters.max_age !== undefined) {
    conditions.push(`age <= $${paramIndex++}`);
    param.push(filters.max_age);
  }

  if (conditions.length === 0) {
    return { message: "Unable to interpret query" };
  }

  if (sort_by && !SUPPORTED_SORT_COLUMNS.includes(sort_by)) {
    return {
      message: "Invalid query parameters",
    };
  }

  const whereClause = " WHERE " + conditions.join(" AND ");
  sqlQuery += whereClause;

  const sortClause = buildSortClause(query);
  if (sortClause) {
    sqlQuery += sortClause;
  }

  // Capture filter params before appending LIMIT/OFFSET params
  const filterParams = [...param];

  const { currentPage, currentLimit, offset } = getPaginationSettings(query);

  sqlQuery += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  param.push(currentLimit, offset);

  try {
    // Count only rows matching the search conditions
    const countResult = await db.query(
      `SELECT COUNT(id) AS total FROM profiles${whereClause}`,
      filterParams,
    );
    const dataResult = await db.query(sqlQuery, param);

    const totalEntries = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(totalEntries / currentLimit);

    // Generate pagination links
    const links = generatePaginationLinks(
      baseUrl,
      currentPage,
      totalPages,
      query,
    );

    return {
      data: dataResult.rows,
      pagination: {
        currentPage: currentPage,
        pageLimit: currentLimit,
        totalEntries: totalEntries,
        totalPages: totalPages,
      },
      links: links,
      message: "successful",
    };
  } catch (err) {
    throw new Error(`Data could not be retrieved: ${err}`);
  }
}

export async function retrieveProfileDataById(id) {
  try {
    // PostgreSQL: db.query() returns an object with a 'rows' array
    const result = await db.query(`SELECT * FROM profiles WHERE id=$1`, [id]);
    return result.rows[0]; // Return first row or undefined
  } catch (err) {
    throw new Error(`Error: ${err.message}`);
  }
}

// ==================== HELPER FUNCTIONS =========================
// Helper function to build query strings from parameters
function buildQueryString(params) {
  const queryParts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      queryParts.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
      );
    }
  }
  return queryParts.join("&");
}

// Helper function to generate pagination links
function generatePaginationLinks(
  baseUrl,
  currentPage,
  totalPages,
  queryParams,
) {
  const links = {};

  // Helper to build a link for a specific page
  const buildLink = (page) => {
    const params = { ...queryParams, page };
    const queryString = buildQueryString(params);
    return `${baseUrl}?${queryString}`;
  };

  // Self link (current page)
  links.self = buildLink(currentPage);

  // Previous link (only if not on first page)
  if (currentPage > 1) {
    links.prev = buildLink(currentPage - 1);
  } else {
    links.prev = null;
  }

  // Next link (only if not on last page)
  if (currentPage < totalPages) {
    links.next = buildLink(currentPage + 1);
  } else {
    links.next = null;
  }

  return links;
}

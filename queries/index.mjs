import { equivalentClasses } from './equivalentClasses.mjs';
import { equivalentProperties } from './equivalentProperties.mjs';
import { instancesOrSubclasses } from './instancesOrSubclasses.mjs';
import { itemByExternalId } from './itemByExternalId.mjs';
import { itemByUrl } from './itemByUrl.mjs';
import { reviewScoreHostnames } from './reviewScoreHostnames.mjs';
import { shortTitle } from './shortTitle.mjs';
import { unitSymbol } from './unitSymbol.mjs';
import { urlMatchPattern } from './urlMatchPattern.mjs';
import { urlProperties } from './urlProperties.mjs';

const queries = {
	equivalentClasses,
	equivalentProperties,
	instancesOrSubclasses,
	itemByExternalId,
	itemByUrl,
	reviewScoreHostnames,
	shortTitle,
	unitSymbol,
	urlMatchPattern,
	urlProperties,
};

/**
 * Runs (and caches the results of) SPARQL queries against a Wikibase
 * instance's Query Service, while respecting each query's declared
 * requirements.
 *
 * Not every Wikibase instance has the same property/item vocabulary as
 * Wikidata. DataTrek, for example, is a much smaller, domain-specific
 * ontology: many of the property/item "roles" that a query might rely on
 * (e.g. `subclassOf`, `equivalentClass`) simply have no mapped ID on that
 * instance. Each query object in `./queries` can declare which roles it
 * needs via `requiredProps` and/or `requiredItems`; this manager checks
 * those declarations before running (or serving a cached copy of) the
 * query, so a query is never sent with `undefined` standing in for a
 * missing property/item ID.
 */
class WikiBaseQueryManager {
	/**
	 * @param {object} [params] - Currently unused; kept for API stability.
	 */
	constructor(params) {
		/**
		 * Cache of previously-run query results, keyed by
		 * `${instance.id}:${queryObject.cacheTag(...)}`.
		 * @type {Object<string, any>}
		 */
		this.cache = {};

		/**
		 * The full set of available query definitions (imported above),
		 * keyed by name — e.g. `this.queries.itemByUrl`.
		 */
		this.queries = queries;
	}

	/**
	 * Decides whether a query should be skipped for the given instance
	 * because the instance is missing properties and/or items the query
	 * declares as required.
	 *
	 * A query may declare `requiredProps` (property roles), `requiredItems`
	 * (item roles), both, or neither. Each declared list is checked
	 * independently — the query is skipped if *either* declared list has a
	 * role missing from the instance. (Previously this used a single `&&`
	 * chain across both lists, which meant a query missing only one of the
	 * two — the common case, since most queries declare just `requiredProps`
	 * — was never actually skipped. See known-issues #1.)
	 *
	 * @param {object} instance - The Wikibase instance config (from
	 *   `wikibases.mjs`), including its resolved `props`/`items` maps.
	 * @param {object} queryObject - One of the query definitions in
	 *   `./queries`, optionally carrying `requiredProps`/`requiredItems`.
	 * @returns {boolean} `true` if the query should be skipped (i.e. not
	 *   run, and not looked up in/written to the cache).
	 */
	isQuerySkippable(instance, queryObject) {
		const propsMissing =
			queryObject?.requiredProps &&
			!this.checkRequiredProps(instance, queryObject.requiredProps);

		const itemsMissing =
			queryObject?.requiredItems &&
			!this.checkRequiredItems(instance, queryObject.requiredItems);

		return Boolean(propsMissing || itemsMissing);
	}

	/**
	 * Synchronously looks up a query's result in the cache, without
	 * triggering a network request.
	 *
	 * @param {object} instance - The Wikibase instance config.
	 * @param {object} queryObject - The query definition to look up.
	 * @param {object} params - Parameters used to build the query's cache
	 *   tag (must match what was passed to `query()` when it was run).
	 * @returns {any[]|false} `[]` if the query is skippable or the instance
	 *   has no `sparqlEndpoint` configured at all; the cached result if one
	 *   exists; otherwise `false` (meaning "not cached yet — call `query()`").
	 */
	queryCached(instance, queryObject, params) {
		if (this.isQuerySkippable(instance, queryObject)) {
			return [];
		}

		const queryCacheTag = `${instance.id}:${queryObject.cacheTag({ params, instance })}`;

		if (!('sparqlEndpoint' in instance)) {
			this.cache[queryCacheTag] = [];
			return [];
		}

		// if its already cached, return cache
		if (queryCacheTag in this.cache) {
			return this.cache[queryCacheTag];
		} else {
			return false;
		}
	}

	/**
	 * Runs a SPARQL query against the instance's Query Service (or returns
	 * a cached result if one is already available), then post-processes
	 * and caches the result.
	 *
	 * @param {object} instance - The Wikibase instance config, including
	 *   `instance.api.sparqlQuery()` for building the request URL.
	 * @param {object} queryObject - The query definition to run. Must
	 *   provide `query()`, `cacheTag()`, and optionally `postProcess()`,
	 *   `requiredProps`, `requiredItems`.
	 * @param {object} params - Query-specific parameters (e.g. the URL or
	 *   entity being looked up), passed through to `queryObject.query()`.
	 * @returns {Promise<any[]>} The (possibly post-processed) query result,
	 *   or `[]` if the query was skipped or the instance has no SPARQL
	 *   endpoint configured.
	 */
	async query(instance, queryObject, params) {
		if (this.isQuerySkippable(instance, queryObject)) {
			return [];
		}

		const queryCacheTag = `${instance.id}:${queryObject.cacheTag({ params, instance })}`;

		const cached = this.queryCached(instance, queryObject, params);
		if (cached) {
			return cached;
		}

		if (!('sparqlEndpoint' in instance)) {
			this.cache[queryCacheTag] = [];
			return [];
		}

		const query = queryObject.query({ params, instance });
		const queryUrl = instance.api.sparqlQuery(query);

		const startTime = performance.now();
		const queryResult = await fetch(queryUrl).then(res => res.json());
		const endTime = performance.now();
		//console.debug(`Query: ${queryObject.id} | ${endTime - startTime}ms`);

		const processedResult = queryObject?.postProcess
			? queryObject.postProcess(queryResult, params)
			: queryResult;
		this.cache[queryCacheTag] = processedResult;

		return processedResult;
	}

	/**
	 * Checks that every required property *role* has a resolved ID on this
	 * instance (e.g. `'subclassOf'` must exist as a key in `instance.props`
	 * — its value being DataTrek's `P181` or Wikidata's `P279`, etc.).
	 *
	 * @param {object} instance - The Wikibase instance config.
	 * @param {string[]} requirements - Property role names that must be
	 *   present in `instance.props`.
	 * @returns {boolean} `true` only if *all* requirements are present.
	 */
	checkRequiredProps(instance, requirements) {
		return requirements.every(
			requirement => requirement in (instance?.props ?? {}),
		);
	}

	/**
	 * Same as {@link WikiBaseQueryManager#checkRequiredProps}, but for item
	 * roles (checked against `instance.items` instead of `instance.props`).
	 *
	 * @param {object} instance - The Wikibase instance config.
	 * @param {string[]} requirements - Item role names that must be present
	 *   in `instance.items`.
	 * @returns {boolean} `true` only if *all* requirements are present.
	 */
	checkRequiredItems(instance, requirements) {
		return requirements.every(
			requirement => requirement in (instance?.items ?? {}),
		);
	}
}

export default WikiBaseQueryManager;
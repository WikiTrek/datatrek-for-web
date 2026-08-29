import { WBK } from './importmap/wikibase-sdk/dist/src/wikibase-sdk.js';
import wikidataSites from './wikidataSites.mjs';
import trekSites from './trekSites.mjs';

const wikibases = {
	wikidata: {
		name: 'Wikidata',
		// We don't want to resolve entities from wikidata but we still need some
		// info about wikidata since some elements in wikibase are hardcoded to
		// wikidata. `resolve: false` will prevent the extension from automatically
		// resolving.
		resolve: false,
		instance: 'https://www.wikidata.org',
		sparqlEndpoint: 'https://query.wikidata.org/sparql',
		autodesc: 'https://autodesc.toolforge.org',
		icon: 'icons/wikidata.svg',
		props: {
			appliesIfRegularExpressionMatches: 'P8460',
			author: 'P50',
			class: 'P2308',
			duration: 'P2047',
			equivalentClass: 'P1709',
			equivalentProperty: 'P1628',
			formatterURL: 'P1630',
			hasCharacteristic: 'P1552',
			instanceOf: 'P31',
			isbn10: 'P957',
			isbn13: 'P212',
			itemOfPropertyConstraint: 'P2305',
			location: 'P276',
			mastodonAddress: 'P4033',
			mobileFormatterURL: 'P7250',
			numberOfPages: 'P1104',
			numberOfReviewsRatings: 'P7887',
			occupation: 'P106',
			officialWebsite: 'P856',
			partOfTheSeries: 'P179',
			pointInTime: 'P585',
			property: 'P2306',
			propertyConstraint: 'P2302',
			propertyScope: 'P5314',
			publicationDate: 'P577',
			referenceURL: 'P854',
			relation: 'P2309',
			retrieved: 'P813',
			reviewScore: 'P444',
			reviewScoreBy: 'P447',
			shortTitle: 'P1813',
			subclassOf: 'P279',
			subpropertyOf: 'P1647',
			thirdPartyFormatterURL: 'P3303',
			title: 'P1476',
			unitSymbol: 'P5061',
			urlMatchPattern: 'P8966',
			urlMatchReplacementValue: 'P8967',
			websiteTitleExtractPattern: 'P10999',
		},
		items: {
			album: 'Q482994',
			allCaps: 'Q3960579',
			allowedEntityTypesConstraint: 'Q52004125',
			asMainValue: 'Q54828448',
			bigInteger: 'Q84314203',
			caseInsensitive: 'Q55121183',
			day: 'Q573',
			edition: 'Q3331189',
			film: 'Q11424',
			hour: 'Q25235',
			human: 'Q5',
			instanceOf: 'Q21503252',
			instanceOrSubclassOf: 'Q30208840',
			itemRequiresStatementConstraint: 'Q21503247',
			lowercase: 'Q65048529',
			minute: 'Q7727',
			musicalWork: 'Q2188189',
			obsoleteProperty: 'Q18644427',
			playlist: 'Q1569406',
			propertyLinkingToArticlesInMediaWikiWebsites: 'Q123667996',
			propertyScopeConstraint: 'Q53869507',
			radioStation: 'Q14350',
			second: 'Q11574',
			subjectTypeConstraint: 'Q21503250',
			televisionSeries: 'Q5398426',
			televisionSeriesEpisode: 'Q21191270',
			userReview: 'Q20058247',
			versionEditionOrTranslation: 'Q3331189',
			week: 'Q23387',
			wikibaseItem: 'Q29934200',
			wikibaseLexeme: 'Q51885771',
			wikibaseSense: 'Q54285715',
			writer: 'Q36180',
			year: 'Q577',
		},
		sites: wikidataSites,
		badResolvers: [
			'https://wikidata-externalid-url.toolforge.org/',
			'https://web.archive.org/web/',
			'https://resolve.eidr.org/',
		],
	},
	commons: {
		name: 'Wikimedia Commons',
		instance: 'https://commons.wikimedia.org',
		resolve: false,
		//sparqlEndpoint: 'https://commons-query.wikimedia.org/sparql',
	},

	// configuration for datatrek starts here
	datatrek: {
		name: 'DataTrek',
		instance: 'https://data.wikitrek.org',
		wgScriptPath: '/dt',
		icon: 'icons/datatrek.svg',
		// DataTrek's own Wikibase Query Service (a WDQS/Blazegraph stack kept
		// in sync by wdqs-updater). This is required for the `url` and
		// `urlMatchPattern` resolvers (resolvers/index.mjs) — both bail out
		// immediately when `sparqlEndpoint` is falsy, so without this line
		// those two resolvers silently never ran for DataTrek at all.
		sparqlEndpoint: 'https://query.wikitrek.org/sparql',
		// DataTrek's property/item numbering does NOT mirror Wikidata's (e.g.
		// Wikidata's "instance of", P31, is DataTrek's P197 — not P31). Every
		// ID below was confirmed either directly on data.wikitrek.org, or via
		// DataTrek's own cross-reference properties:
		//   - P42 "Wikidata Entity": plain ID values (e.g. "P31", "Q5")
		//   - P55 "Exact match": full URLs — sometimes to Wikidata, sometimes
		//     to schema.org/FOAF/vcard/other vocabularies, so only the
		//     wikidata.org ones were usable here
		// Roles not listed below were checked and are not yet mapped on
		// DataTrek — see claude/datatrek-server-reference.md in the project
		// for the full discovery notes. Most of Wikidata's property-
		// constraint / formatter-validation / review-score vocabulary likely
		// doesn't exist on this instance yet at all, rather than just being
		// undocumented, since DataTrek is a small, domain-specific (Star
		// Trek) encyclopedia rather than a general-purpose knowledge base.
		props: {
			// NOTE: P14 was DataTrek's original "instance of" (a P31
			// equivalent), but its meaning has since drifted to "type of
			// page" — it now drives DataTrek's own display/sidebox logic,
			// not Wikidata-style typing. P197 was added later as the true,
			// unambiguous P31 twin. Use P197 here, not P14.
			instanceOf: 'P197',
			subclassOf: 'P181',
			author: 'P47',
			// the property references in formatterURL for instance will be used
			// to generate links from external ids.
			formatterURL: 'P5',
			numberOfPages: 'P155',
			retrieved: 'P201',
			publicationDate: 'P95',
			partOfTheSeries: 'P16',
			duration: 'P32',
			officialWebsite: 'P35',
		},
		items: {
			human: 'Q52',
			hour: 'Q12645',
			day: 'Q12646',
		},
		// this will be used to resolve wiki articles to datatrek items and
		// hopefully the other way around.
		// imported from external file
		sites: trekSites,
		badResolvers: [
			'https://wikidata-externalid-url.toolforge.org/',
		],
	},	
};

Object.keys(wikibases).forEach(name => {
	wikibases[name].id = name;
	const wgScriptPath = wikibases[name]?.wgScriptPath ?? '/w';
	wikibases[name].api = WBK({
		instance: wikibases[name].instance,
		sparqlEndpoint: wikibases[name]?.sparqlEndpoint,
		wgScriptPath: wgScriptPath,
		wikiRoot: `${wikibases[name].instance}${wgScriptPath}`,
	});
});

export default wikibases;
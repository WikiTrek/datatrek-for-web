import { resolvers, resolvedCache } from '../resolvers/index.mjs';
import { getTabMetadata } from '../modules/getTabMetadata.mjs';
import { WikibaseEditQueue } from '../modules/WikibaseEditQueue.mjs';
import wikibases from '../wikibases.mjs';

const wikibaseEditQueue = new WikibaseEditQueue({
	resolvedCache: resolvedCache,
});

wikibaseEditQueue.setProgressUpdateCallback(async queue => {
	try {
		await browser.runtime.sendMessage({
			type: 'update_edit_queue_progress',
			...queue,
		});
	} catch (error) {
		console.error(error);
	}
});

function getCurrentTab() {
	// Query for the active tab in the current window
	return browser.tabs
		.query({ active: true, currentWindow: true })
		.then(tabs => {
			// Since there can only be one active tab in the current window, take the first one
			if (tabs.length > 0) {
				return tabs[0];
			} else {
				throw new Error('No active tab found');
			}
		});
}

async function findTabByUrl(url) {
	try {
		const tabs = await browser.tabs.query({
			url: url.replace(/:\d+/, '').replace(/\#.+/, ''),
		});

		if (tabs.length > 0) {
			const firstTab = tabs[0];
			return firstTab.id; // Return the ID of the first matching tab
		} else {
			console.log(`No tabs found with URL: ${url}`);
			return null; // No matching tabs found
		}
	} catch (error) {
		console.error(`Error finding tab by URL: ${error}`);
		return null; // Error case
	}
}

async function updateSidebar(resolved) {
	await browser.runtime.sendMessage({
		type: 'resolved',
		candidates: resolved,
	});
}

async function resolveUrl(url) {
	return await resolvers.resolve(url);
}

async function resolveAndUpdateSidebar(url, tabId) {
	const results = await resolveUrl(url, tabId);
	if (results) {
		await updateSidebar(results);
		return results;
	}
}

const tabs = {};

async function resolveCurrentTab(tabId) {
	const currentTab = await getCurrentTab();
	if (
		currentTab.url.startsWith('about:') ||
		currentTab.url.startsWith('chrome:') ||
		currentTab.url.startsWith('moz-extension:') ||
		currentTab.frameId > 0
	) {
		// early escape internal urls and navigation that occours in frames
		return;
	}
	if (tabId === currentTab.id) {
		const results = await resolveAndUpdateSidebar(currentTab.url, tabId);
		tabs[tabId] = results;
	} else {
		const results = await resolveUrl(currentTab.url, tabId);
		tabs[tabId] = results;
	}
}

browser.webNavigation.onCommitted.addListener(async function (details) {
	const currentTab = await getCurrentTab();
	if (currentTab.id === details.tabId) {
		await resolveCurrentTab(details.tabId);
	} else {
		await resolveUrl(details.url);
	}
});

browser.webNavigation.onHistoryStateUpdated.addListener(
	async function (details) {
		const currentTab = await getCurrentTab();
		if (currentTab.id === details.tabId) {
			await resolveCurrentTab(details.tabId);
		} else {
			await resolveUrl(details.url);
		}
	},
);

browser.tabs.onActivated.addListener(function (activeInfo) {
	if (tabs?.[activeInfo.tabId]) {
		updateSidebar(tabs[activeInfo.tabId]);
	} else {
		(async () => {
			await resolveCurrentTab(activeInfo.tabId);
		})();
	}
});

browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
	if (message.type === 'request_resolve') {
		const currentTab = await getCurrentTab();
		const results = await resolveAndUpdateSidebar(
			currentTab.url,
			currentTab.id,
		);
		tabs[currentTab.id] = results;
		return Promise.resolve('done');
	} else if (message.type === 'add_to_edit_queue') {
		wikibaseEditQueue.addJobs(message.edits);
		return Promise.resolve('done');
	} else if (message.type === 'request_metadata') {
		const tabId = await findTabByUrl(message.url);
		const metadata = await getTabMetadata(tabId);
		return Promise.resolve({ response: metadata });
	} else if (message.type === 'hash_changed') {
		const tabId = await findTabByUrl(message.url);
		const results = await resolveAndUpdateSidebar(message.url, tabId);
	}
	return false;
});

/**
 * Watches for completed POST requests to any known Wikibase instance's API
 * endpoint (i.e. an edit being submitted), and — once one is spotted —
 * tells the sidebar which entity was just edited, so it can refresh and
 * show the new data.
 *
 * Registered with a *wildcard* URL filter (`${apiEndpoint}*`), because a
 * real edit request's URL commonly carries extra query-string parameters
 * after the bare endpoint (e.g. `?format=json`), so a filter matching the
 * endpoint exactly would miss real requests. The lookup inside the handler
 * has to agree with that: it must also treat the endpoint as a *prefix*
 * of `details.url`, not require an exact match. (Previously it compared
 * with `==`, a strict equality check — which disagreed with the wildcard
 * filter above and meant `wbk` came back `undefined` for any request that
 * had so much as a query string appended, i.e. most real edits. See
 * known-issues #4.)
 */
browser.webRequest.onCompleted.addListener(
	function (details) {
		if (details.method === 'POST') {
			// Find the configured Wikibase instance whose API endpoint is a
			// prefix of this request's URL (matching how the listener's own
			// `urls` filter below is defined, rather than requiring an exact
			// string match against the bare endpoint).
			const wbk = Object.values(wikibases).find(entry =>
				details.url.startsWith(entry.api.instance.apiEndpoint),
			);

			// Guard against two cases that would otherwise throw and silently
			// abort this handler, leaving the sidebar stale after a real edit:
			//  - `wbk` is undefined if this request doesn't actually match any
			//    configured instance (shouldn't normally happen given the
			//    `urls` filter below, but a request scheme/host quirk could
			//    still slip through);
			//  - `details.originUrl` is not guaranteed by the WebExtensions
			//    API — it's absent for requests that didn't originate from a
			//    document, e.g. a fetch() call made from the background script
			//    itself.
			// Either way, there's nothing safe to extract an entity ID from,
			// so skip this request rather than crashing the listener.
			if (!wbk || !details.originUrl) {
				return;
			}

			const editedEnity = details.originUrl
				.replace(wbk.instance, '')
				.match(/([QPLM]\d+)/);

			if (editedEnity) {
				browser.runtime
					.sendMessage({
						type: 'update_entity',
						entity: `${wbk.id}:${editedEnity[0]}`,
					})
					.then(response => {})
					.catch(error => console.error('Message failed:', error));
			}
		}
	},
	{
		urls: Object.values(wikibases).map(
			entry => `${entry.api.instance.apiEndpoint}*`,
		),
	},
);

browser.browserAction.onClicked.addListener(async () => {
	await browser.sidebarAction.toggle();
});
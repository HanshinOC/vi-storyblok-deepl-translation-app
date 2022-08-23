import {
	API_KEY_DATASOURCE_NAME, API_KEY_INITIAL_VALUE,
	APP_DATASOURCE_NAME,
	APP_DATASOURCE_SLUG,
	MODE_DATASOURCE_NAME, MODE_INITIAL_VALUE,
	WORKFLOW_STATUS_DATASOURCE_NAME, WORKFLOW_STATUS_INITIAL_VALUE
} from "./constants";
import Storyblok from "./Storyblok-config";

export const fetchDataSources = async (spaceId, datasourceSlug) => {
	let datasource = await Storyblok.get(`spaces/${spaceId}/datasources`, { "slug": datasourceSlug })
		.then(response => {
			return response;
		}).catch(error => {
			console.log(error)
		})
	return datasource
}

export const updateDataSourceEntries = async (spaceId, datasource_entry) => {
	let response = await Storyblok.put(`spaces/${spaceId}/datasource_entries/${datasource_entry.id}`, {
		"datasource_entry": datasource_entry
	}).then(response => {
		return response;
	}).catch(error => {
		console.log(error)
	})
	return response
}

export const getEntriesRequest = async (spaceId) => {
	let entry = await Storyblok.get(`spaces/${spaceId}/datasource_entries`, {
		"datasource_slug": "auto-translation-configurations"
	})
		.then(response => {
			return response;
		}).catch(error => {
			console.log(error)
		})
	return entry;
}

export const fetchDataSourceEntries = async (spaceId) => {
	let dataSourceEntryValues = null;
	let dataSourcesExistResult = undefined;

	let datasources = [{
		elementName: API_KEY_DATASOURCE_NAME,
		datasourceInitialValue: API_KEY_INITIAL_VALUE,
	}, {
		elementName: MODE_DATASOURCE_NAME,
		datasourceInitialValue: MODE_INITIAL_VALUE,
	}, {
		elementName: WORKFLOW_STATUS_DATASOURCE_NAME,
		datasourceInitialValue: WORKFLOW_STATUS_INITIAL_VALUE,
	}];

	let datasourceEntries = await getEntriesRequest(spaceId)

	if (!datasourceEntries || datasourceEntries.data.datasource_entries.length !== datasources.length)
		dataSourcesExistResult = await dataSourceAlreadyExists(datasourceEntries, APP_DATASOURCE_NAME, datasources, APP_DATASOURCE_SLUG, spaceId);

	if (dataSourcesExistResult && dataSourcesExistResult.length > 0)
		dataSourceEntryValues = dataSourcesExistResult;
	else
		dataSourceEntryValues = datasourceEntries?.data?.datasource_entries ?? null;

	return dataSourceEntryValues;
}

const dataSourceAlreadyExists = async (entryKey, datasourceName, dataSourcesArray, datasourceSlug, spaceId) => {

	let dataSourceEntryValues = []

	if (!entryKey) {
		let dataSource = await createDataSource(spaceId, datasourceName, datasourceSlug);
		if (dataSource) {

			let requestsArray = dataSourcesArray.map(entry => createDataSourceEntry(spaceId, entry.elementName, entry.datasourceInitialValue, dataSource.data.datasource.id))

			await Promise.all(requestsArray)
				.then(res => {
					dataSourceEntryValues = res.map(entry => entry.data.datasource_entry)
				})
		}
	}
	else {

		let key = []

		if (entryKey.data.datasource_entries.length > 0)
			key = dataSourcesArray.filter(dataSourceElement => JSON.stringify(entryKey.data.datasource_entries).indexOf(dataSourceElement.elementName) === -1);
		else
			key = Array.from(dataSourcesArray)

		let datasource = await fetchDataSources(spaceId, datasourceSlug)

		if (datasource) {
			let dataSourceId = datasource.data.datasources.find(element => element.slug === datasourceSlug).id
			let requestsArray = key.map(entry => createDataSourceEntry(spaceId, entry.elementName, entry.datasourceInitialValue, dataSourceId))

			await Promise.all(requestsArray)
				.then(res => {
					dataSourceEntryValues = res.map(entry => entry.data.datasource_entry)
					dataSourceEntryValues = Array.from(entryKey.data.datasource_entries.concat(dataSourceEntryValues))
				})
		}
	}
	return dataSourceEntryValues
}

export const createDataSource = async (spaceId, name, slug) => {
	let newDataSource = await Storyblok.post(`spaces/${spaceId}/datasources`, {
		"datasource": {
			"name": name,
			"slug": slug,
		}
	}).then(response => {
		return response
	}).catch(error => {
		console.log(error)
	})
	return newDataSource
}

export const createDataSourceEntry = async (spaceId, name, value, dataSourceId) => {
	let newDataSource = await Storyblok.post(`spaces/${spaceId}/datasource_entries`, {
		"datasource_entry": {
			"name": name,
			"value": value,
			"datasource_id": dataSourceId
		}
	}).then(response => {
		return response
	}).catch(error => {
		console.log(error)
	})
	return newDataSource;
}


export const fetchStory = async (spaceId, storyId, language) => {
	const storyObj = await Storyblok.get(
		`spaces/${spaceId}/stories/${storyId}`, {})
		.then((response) => {
			return response.data.story;
		})
		.catch((error) => {
			console.log(error);
		});

	const storyJSON = await Storyblok.get(
		`spaces/${spaceId}/stories/${storyId}/export.json`, {}
	)
		.then((response) => {
			return response.data;
		})
		.catch((error) => {
			console.log(error);
		});

	const storyJSONWithLang = await Storyblok.get(
		`spaces/${spaceId}/stories/${storyId}/export.json`,
		{ lang_code: language }
	)
		.then((response) => {
			return response.data;
		})
		.catch((error) => {
			console.log(error);
		});

	return { storyObj, storyJSON, storyJSONWithLang };
}

export const fetchWorkFlowStages = async (spaceId) => {
	const stages = await Storyblok.get(`spaces/${spaceId}/workflow_stages`, {})
		.then(response => {
			console.log(response.data.workflow_stages)
			return response.data.workflow_stages;
		}).catch(error => {
			console.log(error)
		})
	return stages;
}

export const workFlowStageChange = async (spaceId, storyId, workFlowId) => {
	const stages = await Storyblok.post(
		`spaces/${spaceId}/workflow_stage_changes`, {
		"workflow_stage_change": {
			"workflow_stage_id": workFlowId,
			"story_id": storyId
		}
	})
		.then((response) => {
			return response;
		})
		.catch((error) => {
			console.log(error);
		});
	return stages;
}




export const updateStory = async (spaceId, storyId, story, languageCode) => {
	const response = await Storyblok.put(
		`spaces/${spaceId}/stories/${storyId}/import.json`, {
		"data": story,
		"lang_code": languageCode ? languageCode : ""
	}
	)
		.then((response) => {
			return response.data.story;
		})
		.catch((error) => {
			console.log(error);
		});
	return response;
}
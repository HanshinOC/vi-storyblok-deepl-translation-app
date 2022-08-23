/* eslint-disable compat/compat */
import translate from 'deepl';
import { Notification } from 'element-ui';

const supportedLanguages = [
	"BG",
	"CS",
	"DA",
	"DE",
	"EL",
	"EN",
	"EN-GB",
	"EN-US",
	"ES",
	"ET",
	"FI",
	"FR",
	"HU",
	"ID",
	"IT",
	"JA",
	"LT",
	"LV",
	"NL",
	"PL",
	"PT",
	"PT-PT",
	"PT-BR",
	"RO",
	"RU",
	"SK",
	"SL",
	"SV",
	"TR",
	"ZH",
];

export const transformLanguageString = (languageString) => languageString.split('-')[0].toUpperCase();

export const isLanguageDeepLCompatible = (language) => supportedLanguages.indexOf(language) !== -1;

const errorMessages = [
	{ code: 400, message: 'Please check error message and your parameters.' },
	{ code: 403, message: 'API key is invalid/expired.' },
	{ code: 413, message: 'The request size exceeds the limit.' },
	{ code: 429, message: 'Too many requests. Please wait and resend your request.' },
	{ code: 456, message: 'Content is too long.' },
	{ code: 503, message: 'Service not available. Please try again later.' },
	{ code: 529, message: 'Too many requests. Please wait and try again later.' },
];

const returnErrorMessage = (statusCode) => {
	const errorIndex = errorMessages.findIndex((errorObj) => errorObj.code === statusCode);

	if (errorIndex !== -1 && errorMessages[errorIndex]) {
		Notification.error({ title: 'Error', message: errorMessages[errorIndex].message });
		return undefined;
	}

	Notification.error({ title: 'Error', message: 'Something went wrong.. Please try again in a bit.' });
	return undefined;
};

export const deepLTranslate = async (text, targetLanguage, sourceLanguage, deepLKey) => {


	let langCompatible = false
	let truncatedTargetLanguageString = targetLanguage.toUpperCase();
	const truncatedSourceLanguageString = sourceLanguage !== "" ? transformLanguageString(sourceLanguage) : ""

	if (isLanguageDeepLCompatible(truncatedTargetLanguageString)) {
		langCompatible = true
	}
	else if (isLanguageDeepLCompatible(transformLanguageString(targetLanguage))) {
		langCompatible = true
		truncatedTargetLanguageString = transformLanguageString(targetLanguage);
	}

	if (langCompatible) {
		try {
			const response = await translate({
				text,
				target_lang: truncatedTargetLanguageString,
				source_lang: truncatedSourceLanguageString,
				auth_key: deepLKey,
				tag_handling: 'xml',
				split_sentences: '1',
			});

			return response.data;
		} catch (e) {
			returnErrorMessage(e.response.status);
			return undefined;
		}
	}

	return undefined;
};

const Alexa = require('ask-sdk'); // Library for developing Alexa skills
const i18next = require('i18next');
const _ = require('lodash'); // Library for simplifying common tasks
const { Key, Note, Chord } = require("@tonaljs/tonal");


// Utilities for common functions
const utils = require('./utils');
const {
    isRequestType,
    isIntentRequestWithIntentName,
    isOneOfIntentNames,
    isYes,
    isTrainingAnswer,
    getS3PreSignedUrl,
} = utils;

const languageStrings = require('./resources/languageStrings'); // Localized resources used by the localization client
const states = require('./states'); // States to help manage the flow
const {tokens, audio} = require('./apl'); // APL & APL-A documents

// Invoked when a user launches the skill 
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return isRequestType(handlerInput, 'LaunchRequest')
            || isIntentRequestWithIntentName(handlerInput, 'AMAZON.StartOverIntent');
    },
    handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        sessionAttributes.state = states.LAUNCH_EAR_TRAINER;

        // Translate prompts in the user's locale
        const dataSources = {
            launchEarTrainer: handlerInput.t('LAUNCH_EAR_TRAINER')
        };

        return handlerInput.responseBuilder
            .addDirective(utils.getAplADirective(tokens.LAUNCH, audio.launch_ear_trainer, dataSources))
            .reprompt(handlerInput.t('LAUNCH_EAR_TRAINER_REPROMPT'))
            .getResponse();
    }
};

// Invoked when a user wants to begin training
const TrainIntentHandler = {
    canHandle(handlerInput) {
        return isIntentRequestWithIntentName(handlerInput, 'TrainIntent')
            || isYes(handlerInput, states.LAUNCH_EAR_TRAINER);
    },
    handle(handlerInput) {
        const key = "C";
        const octave = 3;
        const keyData = Key.majorKey(key);
        const progressionChordNames = [1, 4, 5, 1].map((step) => {
            return keyData.chords[step - 1];
        })
        const progressionAudio = progressionChordNames.map((chordName) => {
            const chord = Chord.get(chordName);
            return chord.notes.map((note) => {
                const noteNumber = Note.get(`${note}${octave}`).midi - 21;
                return getS3PreSignedUrl(`Media/notes/${noteNumber}.mp3`);
            });
        });

        const quizNoteName = _.sample(keyData.scale);
        const quizNoteOctave = _.sample([2, 3, 4]);
        const quizNoteNumber = Note.get(`${quizNoteName}${quizNoteOctave}`).midi - 21;
        const quizNoteAudio = getS3PreSignedUrl(`Media/notes/${quizNoteNumber}.mp3`);
        const solfege = [
            "do",
            "re",
            "mi",
            "fa",
            "so",
            "la",
            "ti"
        ];
        const quizNoteSolfege = solfege[keyData.scale.indexOf(quizNoteName)];

        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.state = states.TRAINING;
        sessionAttributes.key = key;
        sessionAttributes.octave = quizNoteOctave;
        sessionAttributes.noteId = quizNoteSolfege;


        const dataSources = { 
            chords: progressionAudio,
            quizNote: quizNoteAudio
        };
        return handlerInput.responseBuilder
            .addDirective(utils.getAplADirective(tokens.TRAIN, audio.train, dataSources))
            .reprompt(handlerInput.t('TRAIN_REPROMPT'))
            .getResponse();
    }
};

// Invoked when a user answers a training question
const AnswerTrainingQuestionIntentHandler = {
    canHandle(handlerInput) {
        return isTrainingAnswer(handlerInput, states.TRAINING);
    },
    handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        sessionAttributes.state = states.LAUNCH_EAR_TRAINER;

        const noteId = _.first(utils.getSlotResolutionIds(handlerInput, 'note'));
        const correct = noteId === sessionAttributes.noteId;

        const solfege = [
            "do",
            "re",
            "mi",
            "fa",
            "so",
            "la",
            "ti"
        ];
        const keyData = Key.majorKey(sessionAttributes.key);
        const root = keyData.scale[0];
        const degree = solfege.indexOf(sessionAttributes.noteId);
        let resolutionNoteNames;
        if (degree < 4) {
          resolutionNoteNames = keyData.scale.slice(0, degree + 1).reverse();
        } else {
          resolutionNoteNames = keyData.scale.slice(degree).concat(['octave']);
        }
        const resolution = resolutionNoteNames.map((note) => {
            let midi;
            if (note === 'octave') {
              midi = Note.get(`${root}${sessionAttributes.octave + 1}`).midi;
            } else {
              midi = Note.get(`${note}${sessionAttributes.octave}`).midi;
            }
            const url = getS3PreSignedUrl(`Media/notes/${midi - 21}.mp3`);
            return `<audio src="${url}" />`;
        }).join('');

        let dataSources = {
            result: correct ? "soundbank://soundlibrary/musical/amzn_sfx_bell_short_chime_01" : "soundbank://soundlibrary/alarms/beeps_and_bloops/buzz_02",
            resolution: resolution,
            askForAnother: handlerInput.t('ANOTHER_TRAINING_QUESTION'),
        };

        return handlerInput.responseBuilder
            .addDirective(utils.getAplADirective(tokens.ANSWER, audio.training_answer, dataSources))
            .reprompt(handlerInput.t('CONTINUE_TRAINING_REPROMPT'))
            .getResponse();
    }
};

/**
 * Invoked when a user asks for help
 */
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return isIntentRequestWithIntentName(handlerInput, 'AMAZON.HelpIntent');
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(handlerInput.t('HELP'))
            .reprompt(handlerInput.t('HELP_REPROMPT'))
            .getResponse();
    }
};

/**
 * Invoked when a user wants to stop or cancel
 */
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return isRequestType(handlerInput, 'IntentRequest')
            && isOneOfIntentNames(handlerInput, 'AMAZON.CancelIntent', 'AMAZON.StopIntent', 'AMAZON.NoIntent');
    },
    handle(handlerInput) {
        // Give a goodbye message and end the session
        return handlerInput.responseBuilder
            .speak(handlerInput.t('EXIT'))
            .withShouldEndSession(true)
            .getResponse();
    }
};

/**
 * Invoked when the current skill session ends for any reason other than your code closing the session
 */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return isRequestType(handlerInput, 'SessionEndedRequest');
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        const {request} = handlerInput.requestEnvelope;
        const {reason} = request;

        console.log('Session ended with reason:', reason);

        if (reason === 'ERROR') {
            console.log('error:', JSON.stringify(request.error));
        }

        return handlerInput.responseBuilder.getResponse();
    }
};

/**
 * Provides a graceful fallback message when no other handler can handle an IntentRequest
 * This should be the last request handler configured in skill builder below
 */
const FallbackHandler = {
    canHandle(handlerInput) {
        return isRequestType(handlerInput, 'IntentRequest');
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(handlerInput.t('FALLBACK'))
            .reprompt(handlerInput.t('FALLBACK_REPROMPT'))
            .getResponse();
    }
};

/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);

        return handlerInput.responseBuilder
            .speak(handlerInput.t('ERROR'))
            .withShouldEndSession(true)
            .getResponse();
    }
};

/**
 * This request interceptor will bind two translations function to handlerInput:
 * 't' which returns the translated value
 * 'randomT' which will return a random element if the translated value is an array
 */
const LocalizationInterceptor = {
    process(handlerInput) {
        i18next.init({
            lng: Alexa.getLocale(handlerInput.requestEnvelope),
            resources: languageStrings,
            returnObjects: true
        }).then((t) => {
            handlerInput.t = (...args) => {
                return t(...args);
            };
            handlerInput.randomT = (...args) => {
                const value = t(...args);
                if (_.isArray(value)) {
                    // if the translated value is an array, return a random element
                    return _.sample(value);
                } else {
                    return value;
                }
            };
        });
    }
};

/**
 * The SkillBuilder acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom.
 */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        TrainIntentHandler,
        AnswerTrainingQuestionIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        FallbackHandler // make sure FallbackHandler is last so it doesn't override your other IntentRequest handlers
    )
    .addRequestInterceptors(
        {
            process(handlerInput) {
                console.log('Request:', JSON.stringify(handlerInput, null, 2));
            }
        },
        LocalizationInterceptor
    )
    .addResponseInterceptors(
        {
            process(handlerInput, response) {
                console.log('Response:', JSON.stringify(response, null, 2));
            }
        }
    )
    .addErrorHandlers(
        ErrorHandler
    )
    .lambda();

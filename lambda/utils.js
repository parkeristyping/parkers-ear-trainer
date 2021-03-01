const Alexa = require('ask-sdk');
const _ = require('lodash');
const AWS = require('aws-sdk');

const s3SigV4Client = new AWS.S3({
    signatureVersion: 'v4'
});

// get pre-signed S3 URL
function getS3PreSignedUrl(s3ObjectKey) {

    const bucketName = process.env.S3_PERSISTENCE_BUCKET;
    
    const s3PreSignedUrl = s3SigV4Client.getSignedUrl('getObject', {
        Bucket: bucketName,
        Key: s3ObjectKey,
        Expires: 60*1 // the Expires is capped for 1 minute
    });

    console.log(`Util.s3PreSignedUrl: ${s3ObjectKey} URL ${s3PreSignedUrl}`); // you can see those on CloudWatch

    return s3PreSignedUrl;
}

function isRequestType(handlerInput, requestType) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === requestType;
}

function isIntentName(handlerInput, intentName) {
    return Alexa.getIntentName(handlerInput.requestEnvelope) === intentName;
}

function isOneOfIntentNames(handlerInput, ...intentNames) {
    return intentNames.includes(Alexa.getIntentName(handlerInput.requestEnvelope));
}

function isIntentRequestWithIntentName(handlerInput, intentName) {
    return isRequestType(handlerInput, 'IntentRequest')
        && isIntentName(handlerInput, intentName);
}

function isSessionState(handlerInput, state) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    return sessionAttributes.state === state;
}

function isYes(handlerInput, state) {
    return isRequestType(handlerInput, 'IntentRequest')
        && isIntentName(handlerInput, 'AMAZON.YesIntent')
        && isSessionState(handlerInput, state);
}

function isTrainingAnswer(handlerInput, state) {
    return isRequestType(handlerInput, 'IntentRequest')
        && isIntentName(handlerInput, 'AnswerTrainingQuestionIntent')
        && isSessionState(handlerInput, state);
}

function isNo(handlerInput, state) {
    return isRequestType(handlerInput, 'IntentRequest')
        && isIntentName(handlerInput, 'AMAZON.NoIntent')
        && isSessionState(handlerInput, state);
}

function getSlotResolutionValues(handlerInput, slotName) {
    const slot = Alexa.getSlot(handlerInput.requestEnvelope, slotName);
    const authorities = _.get(slot, 'resolutions.resolutionsPerAuthority', []);
    return _.flatten(_.map(authorities, (authority) => {
        return authority.values;
    }));
}

function getSlotResolutionIds(handlerInput, slotName) {
    const values = getSlotResolutionValues(handlerInput, slotName);
    return _.map(values, (value) => {
        return value.value.id;
    });
}

function getAplADirective(token, document, data = {}) {
    return {
        "type": "Alexa.Presentation.APLA.RenderDocument",
        "token": token,
        "document": document,
        "datasources": {
            "data": {
                "type": "object",
                "properties": data
            }
        }
    }
}

module.exports = {
    isRequestType,
    isIntentName,
    isOneOfIntentNames,
    isIntentRequestWithIntentName,
    isSessionState,
    isTrainingAnswer,
    isYes,
    isNo,
    getSlotResolutionValues,
    getSlotResolutionIds,
    getAplADirective,
    getS3PreSignedUrl
};

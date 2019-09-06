// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const { NewSurface, Permission } = require('actions-on-google');

admin.initializeApp();
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

const LIST_FALLBACK = [`Could you repeat?`, `I didn't catch that`, `I'm having trouble understanding you`]; 

const FINAL_FALLBACK = `I'm sorry I'm having trouble here. Let's talk again later.`;
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  agent.requestSource = agent.ACTIONS_ON_GOOGLE;
  
  let conv= agent.conv();
 
  function welcome(agent) {
    conv.data.fallbackCount = 0;
    console.log(conv.user.storage);
    if(conv.user.storage.name === undefined) {
      conv.ask(`Welcome to my agent! What's your name?`);
    } else {
      conv.ask(`Welcome back ${conv.user.storage.name}!`);
    }
    agent.add(conv);
  }
  
  function setName(agent) {
    let user_name = agent.parameters.name;
    conv.user.storage.name = user_name;
    console.log(conv.user.storage);
    conv.ask(`Nice to meet you ${user_name}`);
    agent.add(conv);
  }
  
  function getName(agent) {
    conv.data.fallbackCount = 0;
  	let user_name = conv.user.storage.name;
    console.log(conv.user.storage);
    if (user_name) {
      agent.add(`Your name is ${user_name}!`);
    }else {
      agent.add(`You never mentioned your name to me`);
    }
  }
 
  function fallback(agent) {
 	conv.data.fallbackCount++;
    console.log(conv.data);
 	if (conv.data.fallbackCount > 2) {
      conv.close(FINAL_FALLBACK);
 	} else {
      let response = LIST_FALLBACK[conv.data.fallbackCount];
      console.log("response: " + response);
      conv.ask(response);
 	}
    agent.add(conv);
}
  
  function showHotelPhotos(agent) {
  	const context = 'Sure, I have some sample images for you.';
    const notification = 'Sample Images';
    const capabilities = ['actions.capability.SCREEN_OUTPUT'];
    const hasScreen = conv.surface.capabilities.has('actions.capability.SCREEN_OUTPUT');
    console.log(hasScreen);
    if (hasScreen) {
      conv.ask(new NewSurface({context, notification, capabilities}));
    } else {
      conv.close("Sorry, you need a screen to see pictures");
    }
    agent.add(conv);
  }
  
  function findStore(agent) {
  	const options = {
    context: 'That\'s not a problem! To get the zip code from your location',
    permissions: ['DEVICE_PRECISE_LOCATION'],
  	};
    conv.ask(new Permission(options));
    agent.add(conv);
  }
  
  function setUserZipcode(agent) {
  	const { latitude, longitude } = conv.device.location.coordinates;
    // => call google's geocoding api: https://developers.google.com/maps/documentation/geocoding/start
    conv.ask('The nearest store is at 1842 N Shoreline boulevard. It\'s 8 minitus on foot');
    agent.add(conv);
  }
  // // Uncomment and edit to make your own intent handler
  // // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function yourFunctionHandler(agent) {
  //   agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
  //   agent.add(new Card({
  //       title: `Title: this is a card title`,
  //       imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
  //       text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
  //       buttonText: 'This is a button',
  //       buttonUrl: 'https://assistant.google.com/'
  //     })
  //   );
  //   agent.add(new Suggestion(`Quick Reply`));
  //   agent.add(new Suggestion(`Suggestion`));
  //   agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
  // }

  // // Uncomment and edit to make your own Google Assistant intent handler
  // // uncomment `intentMap.set('your intent name here', googleAssistantHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function googleAssistantHandler(agent) {
  //   let conv = agent.conv(); // Get Actions on Google library conv instance
  //   conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
  //   agent.add(conv); // Add Actions on Google library responses to your agent's response
  // }
  // // See https://github.com/dialogflow/dialogflow-fulfillment-nodejs/tree/master/samples/actions-on-google
  // // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('get_name', getName);
  intentMap.set('set_name', setName);
  intentMap.set('book_hotel - photos', showHotelPhotos);
  intentMap.set('find_nearest_store - followup', findStore);
  intentMap.set('user_zipcode', setUserZipcode);
  // intentMap.set('your intent name here', yourFunctionHandler);
  // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);
});

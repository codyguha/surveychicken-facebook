var Botkit = require('botkit/lib/Botkit.js');
var mongodb = require('mongodb');
var geocoder = require('geocoder');
const request = require('request');

var controller = Botkit.facebookbot({
    debug: true,
    access_token: process.env.page_token,
    verify_token: process.env.verify_token,
});

var bot = controller.spawn({
});

controller.setupWebserver(process.env.PORT || 3000, function(err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function() {
        console.log('ONLINE!');
    });
});
controller.on('tick', function(bot, event) { });
/// GET USER INFO !!!
function getProfile(id, cb) {
    if (!cb) cb = Function.prototype

    request({
      method: 'GET',
      uri: `https://graph.facebook.com/v2.6/${id}`,
      qs: {
        fields: 'first_name, last_name, gender,locale,timezone',
        access_token: process.env.page_token
      },
      json: true
    }, function(err, res, body) {
      if (err) return cb(err)
      if (body.error) return cb(body.error)

      cb(null, body)
    })
}
function saveUserToMongoDb(id, first_name, last_name, gender, locale, timezone) {
	mongodb.MongoClient.connect(process.env.MONGODB_URI, function(err, db) {
		if (err) throw err;
		var results = db.collection('results');
		results.insert({
			user: {
				id: id,
				first_name: first_name,
				last_name: last_name,
        gender: gender,
        locale: locale,
        timezone: timezone
			},
			chicken_survey: {
        platform: "facebook",
        progress: 0,
				chk_burger: "NA",
				chk_cake: "NA",
				chk_cone: "NA",
				chk_dog: "NA"
			}
		})
	})
}
function saveToMongoDb(id, value, key) {
	mongodb.MongoClient.connect(process.env.MONGODB_URI, function(err, db) {
		if (err) throw err;
		var results = db.collection('results');
		var target_key = "chicken_survey." + key
		var target = {};
		target[target_key] = value
		results.update({
			"user.id": `${id}`
		}, {
			$set: target
		});
	});
}
function saveLocationToMongoDb(id, value) {
	mongodb.MongoClient.connect(process.env.MONGODB_URI, function(err, db) {
		if (err) throw err;
		var results = db.collection('results');
		var target_key = "user.location"
		var target = {};
		target[target_key] = value
		results.update({
			"user.id": `${id}`
		}, {
			$set: target
		});
	});
}
function userValidation(id, user) {
	mongodb.MongoClient.connect(process.env.MONGODB_URI, function(err, db) {
		var results = db.collection('results');
		results.find({
			"user.id": `${id}`
		}).toArray(function(err, found) {
			if (found[0] === undefined) {
				saveUserToMongoDb(`${id}`,`${user.first_name}`, `${user.last_name}`, `${user.gender}`, `${user.locale}`, `${user.timezone}`)
			}
		});
	});
}
function custom_hear_middleware(patterns, message) {

    for (var p = 0; p < patterns.length; p++) {
        if (patterns[p] == message.text) {
            return true;
        }
    }
    return false;
}
controller.hears(['GPS'], 'message_received',custom_hear_middleware, function(bot, incoming) {
  getProfile(incoming.user, function(err, user) {
    getLocation(incoming, user)
  });
});
controller.hears(['Webtest'], 'message_received',custom_hear_middleware, function(bot, incoming) {
  getProfile(incoming.user, function(err, user) {
    webViewTest(incoming, user)
  });
});
controller.hears(['hi', 'Hi'], 'message_received',custom_hear_middleware, function(bot, incoming) {
  getProfile(incoming.user, function(err, user) {
    welcomeUser(incoming, user)
  });
});
controller.hears(['Never'], 'message_received',custom_hear_middleware, function(bot, incoming) {
  getProfile(incoming.user, function(err, user) {
    endSurveyBeforeItStarts(incoming, user)
  });
});
controller.hears(['Continue'], 'message_received',custom_hear_middleware, function(bot, incoming) {
  getProfile(incoming.user, function(err, user) {
    checkProgress(incoming, user)
  });
});
controller.hears(['Nevermind'], 'message_received',custom_hear_middleware, function(bot, incoming) {
  getProfile(incoming.user, function(err, user) {
    checkProgress(incoming, user)
  });
});

controller.hears(['Not right now'], 'message_received',custom_hear_middleware, function(bot, incoming) {
  getProfile(incoming.user, function(err, user) {
    checkProgress(incoming, user)
  });
});
controller.hears(['Not now','Maybe later'], 'message_received',custom_hear_middleware, function(bot, incoming) {
  getProfile(incoming.user, function(err, user) {
    bot.reply(incoming, `Ok. Text "hi" or "GET CHICKEN!" when you have time to chat.`);
  });
});
controller.hears(['GET CHICKEN!','Get Chicken!', 'Get chicken!', 'get chicken'], 'message_received', function(bot, incoming) {
  var progress = 99
  getProfile(incoming.user, function(err, user) {
    getLocation(incoming, user)
    saveToMongoDb(incoming.user, progress, "progress")
  });
});
controller.hears(['Ok, lets do it'], 'message_received',custom_hear_middleware, function(bot, incoming) {
  getProfile(incoming.user, function(err, user) {
    question011(incoming, user)
  });
});
controller.hears(['Tell me a joke'], 'message_received',custom_hear_middleware, function(bot, incoming) {
    startJoke(incoming)
});
controller.hears(['Who’s there?'], 'message_received',custom_hear_middleware, function(bot, incoming) {
  bot.reply(incoming, {
      text: `Bach`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Back who?",
              "payload": "Back who?",
          },
          {
              "content_type": "text",
              "title": "Not now",
              "payload": "Not now",
          }
      ]
  });
});
controller.hears(['Back who?'], 'message_received',custom_hear_middleware, function(bot, incoming) {
  bot.reply(incoming, {
      text: `Bach, bach I'm a chicken!;) LOL - see I knew I could make you smile. What would you like to do next`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Take a survey",
              "payload": "Take a survey",
          },
          {
              "content_type": "text",
              "title": "GET CHICKEN!",
              "payload": "GET CHICKEN!",
          }
      ]
  });
});
function welcomeUser(incoming, user) {
  userValidation(incoming.user, user);
  bot.reply(incoming, {
      text: `Hey ${user.first_name}! I’m the host here at Survey Chicken.  If you get lost, or if you want a fresh start just text “Hi” and I’ll take you back to the beginning. What would you like to do first?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Take a survey",
              "payload": "Take a survey",
          },
          {
              "content_type": "text",
              "title": "Tell me a joke",
              "payload": "Tell me a joke",
          },
          {
              "content_type": "text",
              "title": "Submit Feedback",
              "payload": "feedback",
          }
      ]
  });
}
function surveyMenu(incoming, user) {
  userValidation(incoming.user, user);
  bot.reply(incoming, {
    "attachment": {
        "type": "template",
        "payload": {
            "template_type": "list",
            "elements": [
                {
                    "title": "Chicken Survey",
                    "subtitle": "A survey about your chicken preferences",
                    "image_url": "http://fb-timeline-cover.com/covers-images/download/Robot%20Chicken%20Adult%20Swim%20Cartoon.jpg",
                    "buttons": [
                        {
                            "type":"postback",
                            "title":"Begin survey",
                            "payload":"chicken survey"
                        }
                    ]
                },
                {
                    "title": "Canadian Values",
                    "image_url": "https://pbs.twimg.com/profile_images/525726532828794880/8cruESMv_400x400.png",
                    "subtitle": "The Angus Reid Institute's national poll conducted in partnership with the CBC",
                    "default_action": {
                        "type": "web_url",
                        "url": "http://angusreid.org/canadian-values-index/",
                        "messenger_extensions": true,
                        "webview_height_ratio": "tall",
                        "fallback_url": "http://angusreid.org/canadian-values-index/"
                    },
                    "buttons": [
                        {
                            "title": "View",
                            "type": "web_url",
                            "url": "http://angusreid.org/canadian-values-index",
                            "messenger_extensions": true,
                            "webview_height_ratio": "tall",
                            "fallback_url": "http://angusreid.org/canadian-values-index/"
                        }
                    ]
                },
                {
                    "title": "Cake Survey",
                    "subtitle": "A survey about your cake preferences",
                    "image_url": "http://data.whicdn.com/images/66001440/original.jpg",
                    "buttons": [
                        {
                            "type":"postback",
                            "title":"Begin survey",
                            "payload":"cake survey"
                        }
                    ]
                },
                {
                    "title": "Coffee Survey",
                    "subtitle": "A survey about your coffee preferences",
                    "image_url": "http://www.asociatiaedelvais.ro/wp-content/uploads/2014/11/goodwp.com_163111.jpg",
                    "buttons": [
                        {
                            "type":"postback",
                            "title":"Begin survey",
                            "payload":"coffee survey"
                        }
                    ]
                },
              ]
        }
    }
});
}
function startJoke(incoming) {
  bot.reply(incoming, {
      text: `Knock Knock`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Who’s there?",
              "payload": "Who’s there?",
          },
          {
              "content_type": "text",
              "title": "Not now",
              "payload": "Not now",
          }
      ]
  });
}
controller.on('facebook_postback', function(bot, incoming) {
    console.log(">>>>>>>>>>>POSTBACK: " + incoming.payload)
    if (incoming.payload === "CLICKED_GET_STARTED_BUTTON") {
      getProfile(incoming.user, function(err, user) {
        welcomeUser(incoming, user)
      });
    } else if (incoming.payload === "chicken survey") {
      getProfile(incoming.user, function(err, user) {
        question001(incoming, user)
      });
    }
});
controller.on('message_received', function(bot, incoming) {
  var id = incoming.user
  if (incoming.attachments){
    var lat = incoming.attachments[0].payload.coordinates.lat
    var lng = incoming.attachments[0].payload.coordinates.long
    geocoder.reverseGeocode( lat, lng, function ( err, data ) {
        getProfile(incoming.user, function(err, user) {
          var location_formatted = data.results[0].formatted_address
          var city_name = location_formatted.split(', ')[1]
          saveLocationToMongoDb(id, city_name)
          getChickenNow(incoming, user, city_name)
          console.log(">>>>>>>>>>>>>>>>>>>>>FORMATTED!!!: "+data.results[0].formatted_address)
          console.log(">>>>>>>>>>>>>>>>>>>>>CITY!!!: "+city_name)
        });
    });
  } else if(incoming.quick_reply){
    var text = incoming.text
    var payload = incoming.quick_reply.payload
    getProfile(incoming.user, function(err, user) {
      if (payload === "Take a survey") {
        surveyMenu(incoming, user)
      } else if (payload === "feedback"){
        getFeedback(incoming, user)
      } else if (payload === "response_01"){
        question002(incoming, user)
        saveToMongoDb(id, text, "frequency")
      } else if (payload === "response_02"){
        question003(incoming, user)
        saveToMongoDb(id, text, "buy_based_on")
      } else if (payload === "response_03"){
        question004(incoming, user)
        saveToMongoDb(id, text, "favorite_preparation")
      } else if (payload === "response_04"){
        saveToMongoDb(id, text, "side_dish")
        if (text === "Potatoes") {
          question005Potatoes(incoming, user)
        } else if (text === "Rice") {
          question005Rice(incoming, user)
        } else if (text === "Salad") {
          question005Salad(incoming, user)
        } else if (text === "Vegetables") {
          question005Vegetables(incoming, user)
        }
      } else if (payload === "response_05") {
        question006(incoming, user)
        saveToMongoDb(id, text, "side_dish_detail")
      } else if (payload === "response_06") {
        question007(incoming, user)
        saveToMongoDb(id, text, "location_preference")
      } else if (payload === "response_07") {
        question008(incoming, user)
        saveToMongoDb(id, text, "backup_option")
      } else if (payload === "response_09") {
        if (text === "I love it") {
          saveToMongoDb(id, text, "relationship")
          saveToMongoDb(id, text, "relationship_detail")
          question010end(incoming, user)
        } else if (text === "Guilty pleasure") {
          saveToMongoDb(id, text, "relationship")
          question010a(incoming, user)
        } else if (text === "Not really my thing" || text === "Never eat it") {
          saveToMongoDb(id, text, "relationship")
          question010b(incoming, user)
        }
      } else if (payload === "response_10") {
        question010end(incoming, user)
        saveToMongoDb(id, text, "relationship_detail")
      } else if (payload === "response_11") {
        question012(incoming, user)
        saveToMongoDb(id, text, "chk_burger")
      } else if (payload === "response_12") {
        question013(incoming, user)
        saveToMongoDb(id, text, "chk_cake")
      } else if (payload === "response_13") {
        question014(incoming, user)
        saveToMongoDb(id, text, "chk_cone")
      } else if (payload === "response_14") {
        question015(incoming, user)
        saveToMongoDb(id, text, "chk_dog")
      } else if (payload === "response_15") {
        saveToMongoDb(id, text, "hunger")
        if (text === "Yes") {
          suggestChicken(incoming, user)
        } else {
          getEmoji(incoming, user)
        }
      } else if (payload === "get_chicken") {
        getLocation(incoming, user)
      } else if (payload === "response_16") {
        saveToMongoDb(id, text, "contact_method")
        if (text === "Email") {
          getEmail(incoming, user)
        } else if (text === "Twitter") {
          getTwitter(incoming, user)
        } else if (text === "Linkedin") {
          getLinkedin(incoming, user)
        } else if (text === "Do not contact me") {
          saveToMongoDb(id, text, "contact")
          surveyEnd(incoming, user)
        }
      }
    });
  } else {
    console.log(">>>>>>>>>>NOMETHODFOR: " + incoming)
  }
});
function endSurveyBeforeItStarts(incoming, user){
  var progress = 2
  bot.reply(incoming, {
      text: `Ok I’m glad we got that out the way.  I suppose there is no point in bugging you with more questions about your chicken preferences.  Do you want to continue the survey anyways?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Continue",
              "payload": "Continue",
          },
          {
              "content_type": "text",
              "title": "Not now",
              "payload": "Not now",
          }
      ]
  });
  saveToMongoDb(incoming.user, progress, "progress")
  // startRemindUserCounter(incoming)

}
function question001(incoming, user){
  var progress = 1
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
      text: `Awesome, lets get started. First off, how often do you eat chicken?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "On a regular basis",
              "payload": "response_01",
          },
          {
              "content_type": "text",
              "title": "Once in a while",
              "payload": "response_01",
          },
          {
              "content_type": "text",
              "title": "Rarely",
              "payload": "response_01",
          },
          {
              "content_type": "text",
              "title": "Never",
              "payload": "response_01",
          }
      ]
  });
  // startRemindUserCounter(incoming)
}
function question002(incoming, user){
  var progress = 2
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
      text: `Great! Next question... When you shop for chicken at the grocery store what is most important to you?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Value",
              "payload": "response_02",
          },
          {
              "content_type": "text",
              "title": "Quality",
              "payload": "response_02",
          },
          {
              "content_type": "text",
              "title": "Ethical farming",
              "payload": "response_02",
          },
          {
              "content_type": "text",
              "title": "Freshness",
              "payload": "response_02",
          }
      ]
  });
	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question003(incoming, user){
  var progress = 3
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
      text: `What is your favorite way to prepare chicken at home?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Pan fry it",
              "payload": "response_03",
          },
          {
              "content_type": "text",
              "title": "Deep fry it",
              "payload": "response_03",
          },
          {
              "content_type": "text",
              "title": "Bake it",
              "payload": "response_03",
          },
          {
              "content_type": "text",
              "title": "BBQ it",
              "payload": "response_03",
          },
          {
              "content_type": "text",
              "title": "Roast it",
              "payload": "response_03",
          },
          {
              "content_type": "text",
              "title": "Other",
              "payload": "response_03",
          }
      ]
  });

	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question004(incoming, user){
  var progress = 4
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
      text: `What is your preferred side dish to have with chicken?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Potatoes",
              "payload": "response_04",
          },
          {
              "content_type": "text",
              "title": "Salad",
              "payload": "response_04",
          },
          {
              "content_type": "text",
              "title": "Rice",
              "payload": "response_04",
          },
          {
              "content_type": "text",
              "title": "Vegetables",
              "payload": "response_04",
          }
      ]
  });

	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question005Potatoes(incoming, user){
  var progress = 4
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
      text: `Yes! I love Potatoes too. How do you like your potatoes?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Mashed",
              "payload": "response_05",
          },
          {
              "content_type": "text",
              "title": "Roasted",
              "payload": "response_05",
          },
          {
              "content_type": "text",
              "title": "Fries",
              "payload": "response_05",
          },
          {
              "content_type": "text",
              "title": "Baked",
              "payload": "response_05",
          }
      ]
  });
	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question005Rice(incoming, user){
  var progress = 4
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
      text: `Rice is nice. What type of rice goes best with chicken?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Brown",
              "payload": "response_05",
          },
          {
              "content_type": "text",
              "title": "Basmati",
              "payload": "response_05",
          },
          {
              "content_type": "text",
              "title": "White",
              "payload": "response_05",
          },
          {
              "content_type": "text",
              "title": "Flavoured",
              "payload": "response_05",
          }
      ]
  });
	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question005Salad(incoming, user){
  var progress = 4
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
      text: `Keeping it healthy with a salad, I like that. What type of salad goes best with chicken?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Greek",
              "payload": "response_05",
          },
          {
              "content_type": "text",
              "title": "Ceaser",
              "payload": "response_05",
          },
          {
              "content_type": "text",
              "title": "Green",
              "payload": "response_05",
          },
          {
              "content_type": "text",
              "title": "Coleslaw",
              "payload": "response_05",
          }
      ]
  });
	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question005Vegetables(incoming, user){
  var progress = 4
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
      text: `Gotta get those vegetables in. What vegetable goes best with chicken?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Broccoli",
              "payload": "response_05",
          },
          {
              "content_type": "text",
              "title": "Carrots",
              "payload": "response_05",
          },
          {
              "content_type": "text",
              "title": "Spinach",
              "payload": "response_05",
          },
          {
              "content_type": "text",
              "title": "Green Beans",
              "payload": "response_05",
          },
          {
              "content_type": "text",
              "title": "Asparagus",
              "payload": "response_05",
          }
      ]
  });
	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question006(incoming, user){
  var progress = 5
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
      text: `Where do you most typically consume chicken outside of your home?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Family restaurant",
              "payload": "response_06",
          },
          {
              "content_type": "text",
              "title": "Fast food",
              "payload": "response_06",
          },
          {
              "content_type": "text",
              "title": "Fine dining",
              "payload": "response_06",
          },
          {
              "content_type": "text",
              "title": "Convenience store",
              "payload": "response_06",
          }
      ]
  });
	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question007(incoming, user){
  var progress = 6
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
      text: `If a preferred chicken option is not available which of the following would you typically choose?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Beef",
              "payload": "response_07",
          },
          {
              "content_type": "text",
              "title": "Seafood",
              "payload": "response_07",
          },
          {
              "content_type": "text",
              "title": "Pork",
              "payload": "response_07",
          },
          {
              "content_type": "text",
              "title": "Vegetarian option",
              "payload": "response_07",
          }
      ]
  });
	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question008(incoming, user){
  var progress = 7
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
      text: `Thanks for your input so far.  Are you ok to continue and answer a couple more questions?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Continue",
              "payload": "Continue",
          },
          {
              "content_type": "text",
              "title": "Maybe later",
              "payload": "Maybe later",
          }
      ]
  });
	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question009(incoming, user){
  var progress = 7
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
      text: `You're awesome. Let’s get specific. What is your relationship with fried chicken?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "I love it",
              "payload": "response_09",
          },
          {
              "content_type": "text",
              "title": "Guilty pleasure",
              "payload": "response_09",
          },
          {
              "content_type": "text",
              "title": "Not really my thing",
              "payload": "response_09",
          },
          {
              "content_type": "text",
              "title": "Never eat it",
              "payload": "response_09",
          },
      ]
  });
	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question010a(incoming, user){
  var progress = 7
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
      text: `Guilty pleasure you say, tell me more.`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Cures hungovers",
              "payload": "response_10",
          },
          {
              "content_type": "text",
              "title": "Special reward",
              "payload": "response_10",
          },
          {
              "content_type": "text",
              "title": "Personal matter",
              "payload": "response_10",
          }
      ]
  });

	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question010b(incoming, user){
  var progress = 7
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
      text: `So fried chicken isnt on your menu. Can you tell me more?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "I eat healthy",
              "payload": "response_10",
          },
          {
              "content_type": "text",
              "title": "Hard to make at home",
              "payload": "response_10",
          },
          {
              "content_type": "text",
              "title": "Too expensive",
              "payload": "response_10",
          },
          {
              "content_type": "text",
              "title": "Don't like the taste",
              "payload": "response_10",
          },
          {
              "content_type": "text",
              "title": "Personal matter",
              "payload": "response_10",
          }
      ]
  });

	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question010end(incoming, user){
  var progress = 8
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
      text: `Ok cool. In the next set of questions I’m going to show you some pictures of fried chicken entrees.  Use the answers provided to tell me what you think.`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Ok, lets do it",
              "payload": "Ok, lets do it",
          },
          {
              "content_type": "text",
              "title": "NO WAY!",
              "payload": "NO WAY!",
          }
      ]
  });

	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question011(incoming, user){
  var progress = 11
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
    attachment:{
    type:"image",
    payload:{
      url:"https://raw.githubusercontent.com/codyguha/survey-images/master/kikfriedchicken/FriedCH_burger.jpg"
      }
    },
    quick_replies: [
          {
              "content_type": "text",
              "title": "This looks gross",
              "payload": "response_11",
          },
          {
              "content_type": "text",
              "title": "Not my first choice",
              "payload": "response_11",
          },
          {
              "content_type": "text",
              "title": "I’m on the fence",
              "payload": "response_11",
          },
          {
              "content_type": "text",
              "title": "This looks eatable",
              "payload": "response_11",
          },
          {
              "content_type": "text",
              "title": "This looks delicious",
              "payload": "response_11",
          }
      ]
  });

	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question012(incoming, user){
  var progress = 12
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
    attachment:{
    type:"image",
    payload:{
      url:"https://raw.githubusercontent.com/codyguha/survey-images/master/kikfriedchicken/FriedCH_cake.jpg"
      }
    },
    quick_replies: [
          {
              "content_type": "text",
              "title": "This looks gross",
              "payload": "response_12",
          },
          {
              "content_type": "text",
              "title": "Not my first choice",
              "payload": "response_12",
          },
          {
              "content_type": "text",
              "title": "I’m on the fence",
              "payload": "response_12",
          },
          {
              "content_type": "text",
              "title": "This looks eatable",
              "payload": "response_12",
          },
          {
              "content_type": "text",
              "title": "This looks delicious",
              "payload": "response_12",
          }
      ]
  });

	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question013(incoming, user){
  var progress = 13
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
    attachment:{
    type:"image",
    payload:{
      url:"https://raw.githubusercontent.com/codyguha/survey-images/master/kikfriedchicken/FriedCH_cone.jpg"
      }
    },
    quick_replies: [
          {
              "content_type": "text",
              "title": "This looks gross",
              "payload": "response_13",
          },
          {
              "content_type": "text",
              "title": "Not my first choice",
              "payload": "response_13",
          },
          {
              "content_type": "text",
              "title": "I’m on the fence",
              "payload": "response_13",
          },
          {
              "content_type": "text",
              "title": "This looks eatable",
              "payload": "response_13",
          },
          {
              "content_type": "text",
              "title": "This looks delicious",
              "payload": "response_13",
          }
      ]
  });

	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question014(incoming, user){
  var progress = 14
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
    attachment:{
    type:"image",
    payload:{
      url:"https://raw.githubusercontent.com/codyguha/survey-images/master/kikfriedchicken/FriedCH_dog.jpg"
      }
    },
    quick_replies: [
          {
              "content_type": "text",
              "title": "This looks gross",
              "payload": "response_14",
          },
          {
              "content_type": "text",
              "title": "Not my first choice",
              "payload": "response_14",
          },
          {
              "content_type": "text",
              "title": "I’m on the fence",
              "payload": "response_14",
          },
          {
              "content_type": "text",
              "title": "This looks eatable",
              "payload": "response_14",
          },
          {
              "content_type": "text",
              "title": "This looks delicious",
              "payload": "response_14",
          }
      ]
  });

	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question015(incoming, user){
  var progress = 15
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
      text: `Has this survey made you hungry?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Yes",
              "payload": "response_15",
          },
          {
              "content_type": "text",
              "title": "Not really",
              "payload": "response_15",
          }
      ]
  });
	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function suggestChicken(incoming, user){
  var progress = 16
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
      text: `Ok would you like me to suggest some local take out options?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Yes please",
              "payload": "get_chicken",
          },
          {
              "content_type": "text",
              "title": "No thanks",
              "payload": "No thanks",
          }
      ]
  });
	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function getLocation(incoming, user){
  bot.reply(incoming, {
      text: `I will find the closest restaurant that will deliver chicken to you.  Please share your location.`,
      quick_replies: [
          {
              "title": "Location",
              "content_type": "location",
          }
      ]
  });
}
function getChickenNow(incoming, user, city_name){
  var message = {
    "attachment":{
      "type":"template",
      "payload":{
        "template_type":"generic",
        "elements":[
          {
            "title":"GET CHICKEN NOW!",
            "item_url":"https://www.just-eat.ca/delivery/"+city_name+"/chicken/",
            "image_url":"http://www.digitalnativescontent.com/wp-content/uploads/2016/01/GHTF-outdoor.jpg",
            "subtitle": "Why not order some delivery right now!",
            "buttons":[
              {
                "type":"web_url",
                "url":"https://www.just-eat.ca/delivery/"+city_name+"/chicken/",
                "title":"GET CHICKEN!"
              },
              {
                "type":"postback",
                "title":"Nevermind",
                "payload":"Nevermind"
              }
            ]
          }
        ]
      }
    }
  }
  bot.reply(incoming, message);
}

function getFeedback(incoming, user){
  var askFeedbackType = function(err, convo) {
      convo.ask({
        text: 'Ok, as a first step. Can you please let me know if this is going to be "Positive" or "Negative" feedback.',
        quick_replies: [
            {
                "content_type": "text",
                "title": "Positive",
                "payload": "Positive",
            },
            {
                "content_type": "text",
                "title": "Negative",
                "payload": "Negative",
            }
        ]
      }, function(response, convo) {
        saveToMongoDb(incoming.user, response.payload, "feedback_type")
        getInput(response, convo);
        convo.next();
      });
  };
    var getInput = function(response, convo) {
        convo.ask({
          text: 'Thanks for that.  Feel free to send a text, a photo, or even a video to provide feedback.',
          }, function(response, convo) {
          var json_object = JSON.stringify(response, null, "\t")
          console.log(">>>>>>>>>>>>>>>>>>>>>FEEDBACK!!!: "+ json_object)
          determineInput(response, convo)
          convo.next();
        });
    };
    var determineInput = function(response, convo) {
      if (response.attachments) {
        if (response.attachments[0].type === "image"){
          convo.say('Thanks for the image.');
          saveToMongoDb(incoming.user, response.attachments[0].payload.url, "feedback")
          approveInput(response, convo)
          convo.next();
          console.log(">>>>>>>>>>>>>>>>>>>>>GOT-IMAGE!!!")
        } else if (response.attachments[0].type === "video"){
          saveToMongoDb(incoming.user, response.attachments[0].payload.url, "feedback")
          convo.say('Thanks for the video.');
          approveInput(response, convo)
          convo.next();
          console.log(">>>>>>>>>>>>>>>>>>>>>GOT-VIDEO!!!")
        } else {
          convo.say('Thanks for whatever that is.');
          saveToMongoDb(incoming.user, response.attachments[0].payload, "feedback")
          approveInput(response, convo)
          convo.next();
          console.log(">>>>>>>>>>>>>>>>>>>>>GOT-SOMETHING!!!")
        }
      } else {
        convo.say('Thanks for the feedback.');
        saveToMongoDb(incoming.user, response.text, "feedback")
        approveInput(response, convo)
        convo.next();
        console.log(">>>>>>>>>>>>>>>>>>>>>GOT-TEXT!!!")
      }
    }
    var approveInput = function(response, convo){
      convo.ask({
        text: 'We review every submission and may reach out for more info if you approve.',
        quick_replies: [
            {
                "content_type": "text",
                "title": "Approve",
                "payload": "Approve",
            },
            {
                "content_type": "text",
                "title": "No thanks",
                "payload": "Nope",
            }
        ]
      }, function(response, convo) {
        convo.say(`Got it. Thanks again ${user.first_name}`);
        convo.next();
      });
    }
    bot.startConversation(incoming, askFeedbackType);
}
function getEmoji(incoming, user){
  var progress = 16
  saveToMongoDb(incoming.user, progress, "progress")
  var id = incoming.user
    bot.startConversation(incoming, function(err, convo) {
        convo.ask({
          text: "…and we are done! Thanks for the chat. Let me know what you thought by selecting an emoji.",
        }, function(response, convo) {
            getContact(incoming, user)
            saveToMongoDb(id, response, "emoji")
            // getContact(incoming, user)
            convo.next();
          });
    });

}
function getContact (incoming, user) {
  var progress = 18
  saveToMongoDb(incoming.user, progress, "progress")
  bot.reply(incoming, {
      text: `Sweet. If you would like to stay in the “coop", I mean loop, on Survey Chicken updates just leave me your contact info and I’ll keep you posted.`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "Do not contact me",
              "payload": "response_16",
          },
          {
              "content_type": "text",
              "title": "Email",
              "payload": "response_16",
          },
          {
              "content_type": "text",
              "title": "Twitter",
              "payload": "response_16",
          },
          {
              "content_type": "text",
              "title": "Linkedin",
              "payload": "response_16",
          }
      ]
  });

  // endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function webViewTest(incoming, user) {
  bot.reply(incoming, {
    "attachment": {
        "type": "template",
        "payload": {
            "template_type": "list",
            "elements": [
                {
                    "title": "Canadian Values",
                    "image_url": "https://pbs.twimg.com/profile_images/525726532828794880/8cruESMv_400x400.png",
                    "subtitle": "The Angus Reid Institute's national poll conducted in partnership with the CBC",
                    "default_action": {
                        "type": "web_url",
                        "url": "http://angusreid.org/canadian-values-index/",
                        "messenger_extensions": true,
                        "webview_height_ratio": "tall",
                        "fallback_url": "http://angusreid.org/canadian-values-index/"
                    },
                    "buttons": [
                        {
                            "title": "View",
                            "type": "web_url",
                            "url": "http://angusreid.org/canadian-values-index",
                            "messenger_extensions": true,
                            "webview_height_ratio": "tall",
                            "fallback_url": "http://angusreid.org/canadian-values-index/"
                        }
                    ]
                },
                {
                    "title": "Reddit",
                    "image_url": "https://www.wired.com/wp-content/uploads/2015/06/reddit-alien-blue-featured.jpg",
                    "subtitle": "View front page",
                    "default_action": {
                        "type": "web_url",
                        "url": "https://www.reddit.com",
                        "messenger_extensions": true,
                        "webview_height_ratio": "tall",
                        "fallback_url": "https://www.reddit.com/"
                    },
                    "buttons": [
                        {
                            "title": "View",
                            "type": "web_url",
                            "url": "https://www.reddit.com",
                            "messenger_extensions": true,
                            "webview_height_ratio": "tall",
                            "fallback_url": "https://www.reddit.com/"
                        }
                    ]
                }
            ]
        }
    }
});
}
function getEmail(incoming, user){
  var id = incoming.user
    bot.startConversation(incoming, function(err, convo) {
        convo.ask({
          text: "Awesome, and what is your email address?",
        }, function(response, convo) {
            surveyEnd(incoming, user)
            saveToMongoDb(id, response, "contact")
            // getContact(incoming, user)
            convo.next();
          });
    });
  // endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function getTwitter(incoming, user){
  var id = incoming.user
    bot.startConversation(incoming, function(err, convo) {
        convo.ask({
          text: "Awesome, and what is your twitter handle?",
        }, function(response, convo) {
            surveyEnd(incoming, user)
            saveToMongoDb(id, response, "contact")
            // getContact(incoming, user)
            convo.next();
          });
    });
  // endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function getLinkedin(incoming, user){
  var id = incoming.user
    bot.startConversation(incoming, function(err, convo) {
        convo.ask({
          text: "Awesome, and what is your Linkedin address?",
        }, function(response, convo) {
            surveyEnd(incoming, user)
            saveToMongoDb(id, response, "contact")
            // getContact(incoming, user)
            convo.next();
          });
    });
  // endRemindUserCounter()
  // startRemindUserCounter(incoming)
}

function surveyEnd(incoming, user){
   bot.reply(incoming, `Thank you that is all I wanted to know. I will be in touch if I recieve any updates. Text "hi" to do the survey agian or text "GET CHICKEN!" to get chicken delivered right now!`);
}
controller.hears(['what can I do here?'], 'message_received', function(bot, message) {
    bot.reply(message, "You can complete surveys with me to help me complete my research!");
});

controller.hears(['help'], 'message_received', function(bot, message) {
    bot.reply(message, "type 'hi' to get started.");
});

controller.on('message_received', function(bot, message) {
    console.log(message)
});

function checkProgress(incoming, user){
  var id = incoming.user
  mongodb.MongoClient.connect(process.env.MONGODB_URI, function(err, db) {
    var results = db.collection('results');
    results.find({
      "user.id": `${id}`
    }).toArray(function(err, found) {
      var progress = found[0].chicken_survey.progress
      if (progress === 0) {
    		question001(incoming, user)
    	} else if (progress === 1) {
    		question001(incoming, user)
    	} else if (progress === 2) {
    		question002(incoming, user)
    	} else if (progress === 3) {
    		question003(incoming, user)
    	} else if (progress === 4) {
    		question004(incoming, user)
    	} else if (progress === 5) {
    		question006(incoming, user)
    	} else if (progress === 6) {
    		question007(incoming, user)
    	} else if (progress === 7) {
    		question009(incoming, user)
    	} else if (progress === 8) {
    		question010end(incoming, user)
    	} else if (progress === 11) {
    		question011(incoming, user)
    	} else if (progress === 12) {
    		question012(incoming, user)
    	} else if (progress === 13) {
    		question013(incoming, user)
    	} else if (progress === 14) {
    		question014(incoming, user)
    	} else if (progress === 15) {
    		question015(incoming, user)
    	} else if (progress === 16) {
        getEmoji(incoming, user)
      }else if (progress === 99) {
        bot.reply(incoming, `Text "hi" or "GET CHICKEN!" anytime :)`);
      }
    });
  });

}

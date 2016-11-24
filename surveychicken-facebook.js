var Botkit = require('botkit/lib/Botkit.js');
var mongodb = require('mongodb');
const request = require('request');

var controller = Botkit.facebookbot({
    debug: true,
    access_token: process.env.page_token,
    verify_token: process.env.verify_token,
});

var bot = controller.spawn({
});

var progress;

controller.setupWebserver(process.env.PORT || 3000, function(err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function() {
        console.log('ONLINE!');
    });
});
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
        timezone: timezone,
        platform: "facebook"
			},
			chicken_survey: {
				chk_burger: "1",
				chk_cake: "1",
				chk_cone: "1",
				chk_dog: "1",
				emoji: "<3",
        contact: "user@user.com"
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

controller.hears(['hi', 'Hi'], 'message_received',custom_hear_middleware, function(bot, incoming) {
  getProfile(incoming.user, function(err, user) {
    welcomeUser(incoming, user)
  });
});
controller.hears(['Continue'], 'message_received',custom_hear_middleware, function(bot, incoming) {
  getProfile(incoming.user, function(err, user) {
    checkProgress(incoming, user)
  });
});
controller.hears(['Ok, lets do it'], 'message_received',custom_hear_middleware, function(bot, incoming) {
  getProfile(incoming.user, function(err, user) {
    question011(incoming, user)
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
          }
      ]
  });
}
controller.on('message_received', function(bot, incoming) {
  var id = incoming.user
  var payload = incoming.quick_reply.payload
  var text = incoming.text
  getProfile(incoming.user, function(err, user) {
    if (payload === "Take a survey") {
      question001(incoming, user)
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
      } else if (text === "It's a guilty pleasure") {
        saveToMongoDb(id, text, "relationship")
        question010a(incoming, user)
      } else if (text === "Not really my thing" || text === "I’ll die before I eat fried chicken") {
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
      }
    } else if (payload === "get_chicken") {
      getChicken(incoming, user)
    }
  });
});
function question001(incoming, user){
  progress = 1
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
              "title": "Once and a while",
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
  progress = 2
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
              "title": "Fair treatment of animals",
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
  progress = 3
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
  progress = 4
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
  progress = 4
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
  progress = 4
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
              "title": "Flavoured - Coconut, etc",
              "payload": "response_05",
          }
      ]
  });
	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question005Salad(incoming, user){
  progress = 4
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
  progress = 4
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
  progress = 5
  bot.reply(incoming, {
      text: `Where do you most typically consume chicken outside of your home?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "At a family style restaurant",
              "payload": "response_06",
          },
          {
              "content_type": "text",
              "title": "At fast food establishment",
              "payload": "response_06",
          },
          {
              "content_type": "text",
              "title": "At a fine dining restaurant",
              "payload": "response_06",
          },
          {
              "content_type": "text",
              "title": "At a grocery or convienience store",
              "payload": "response_06",
          }
      ]
  });
	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question007(incoming, user){
  progress = 6
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
  progress = 7
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
  progress = 7
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
              "title": "It's a guilty pleasure",
              "payload": "response_09",
          },
          {
              "content_type": "text",
              "title": "Not really my thing",
              "payload": "response_09",
          },
          {
              "content_type": "text",
              "title": "I’ll die before I eat fried chicken",
              "payload": "response_09",
          },
      ]
  });
	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question010a(incoming, user){
  progress = 7
  bot.reply(incoming, {
      text: `Guilty pleasure you say, tell me more.`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "After a night of hard partying",
              "payload": "response_10",
          },
          {
              "content_type": "text",
              "title": "A treat if I’ve been eating good for a while",
              "payload": "response_10",
          },
          {
              "content_type": "text",
              "title": "It’s a personal matter",
              "payload": "response_10",
          }
      ]
  });

	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question010b(incoming, user){
  progress = 7
  bot.reply(incoming, {
      text: `So fried chicken isnt on your menu. Can you tell me more?`,
      quick_replies: [
          {
              "content_type": "text",
              "title": "I’m trying to eat healthy these days",
              "payload": "response_10",
          },
          {
              "content_type": "text",
              "title": "It's not convienient to make at home",
              "payload": "response_10",
          },
          {
              "content_type": "text",
              "title": "It's not convienient to purchase",
              "payload": "response_10",
          },
          {
              "content_type": "text",
              "title": "I just dont like the taste",
              "payload": "response_10",
          },
          {
              "content_type": "text",
              "title": "I’m not going to get into it",
              "payload": "response_10",
          }
      ]
  });

	// endRemindUserCounter()
  // startRemindUserCounter(incoming)
}
function question010end(incoming, user){
  progress = 8
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
  progress = 11
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
  progress = 12
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
  progress = 13
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
  progress = 14
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
  progress = 15
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
  progress = 15
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
function getChicken(incoming, user){
  var message = {
    "attachment":{
      "type":"template",
      "payload":{
        "template_type":"generic",
        "elements":[
          {
            "title":"Welcome to Peter\'s Hats",
            "item_url":"https://petersfancybrownhats.com",
            "image_url":"https://petersfancybrownhats.com/company_image.png",
            "subtitle":"We\'ve got the right hat for everyone.",
            "buttons":[
              {
                "type":"web_url",
                "url":"https://petersfancybrownhats.com",
                "title":"View Website"
              },
              {
                "type":"postback",
                "title":"Start Chatting",
                "payload":"DEVELOPER_DEFINED_PAYLOAD"
              }
            ]
          }
        ]
      }
    }
  }
  bot.reply(incoming, message);
}
controller.hears(['what can I do here?'], 'message_received', function(bot, message) {
    bot.reply(message, "You can complete surveys with me to help me complete my research!");
});

controller.hears(['help'], 'message_received', function(bot, message) {
    bot.reply(message, "type 'hi' to see a list of surveys to complete.");
});

controller.on('message_received', function(bot, message) {
    console.log(message)
});

// controller.on('facebook_optin', function(bot, message) {
//     bot.reply(message, "YOU CLICKED PLUGIN !!!");
// });

function checkProgress(incoming, user){
  console.log("checked progress outputs!!!:  " + progress)
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
    getContact(incoming, user)
  }
}

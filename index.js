module.change_code = 1;
'use strict';

var alexa = require( 'alexa-app' );
var _ = require('lodash');
var app = new alexa.app( 'SyneBroker' );
var http = require( 'https' );
var twilio = require('twilio');


var pubnub = require('pubnub');

var p = pubnub.init({
    subscribe_key : "sub-c-b1cf034e-3e48-11e6-ba28-02ee2ddab7fe",
    publish_key : "pub-c-6333b617-6b69-44f0-8d79-d13a49f0c100",
    ssl: false
});





var stocks = [ 'AAPL', 'GOOG', 'AMZN' ];
var stocksTopThree = [ 'MSFT', 'INTC', 'YHOO' ];

var url = function(stockIds){
  var yahoourl = 'https://query.yahooapis.com/v1/public/yql';
    yahoourl += '?q=select * from yahoo.finance.quotes where symbol in (';
    yahoourl += '"' + stockIds + '"'; 
    yahoourl += ')&env=store://datatables.org/alltableswithkeys&format=json';
	
	return yahoourl;
};    
 
   
var getJsonFromYahoo = function(stock, callback){
    console.log(url(stock));
	http.get( url(stock), function( response ) {
        
        var data = '';
        
        response.on( 'data', function( x ) { data += x; } );

        response.on( 'end', function() {
			
            var json = JSON.parse( data );
			p.publish({
			"message" : json,
			"channel" : "data_channel",
			});

            var text = 'Here are your protfolio details, ';
			var opennumbertag="<say-as interpret-as='cardinal'>";
			var closenumbertag="</say-as>";

            for ( var i=0 ; i < stocks.length ; i++ ) {
                var quote = json.query.results.quote[i];
                if ( quote.Name ) {
                    text += quote.Name + ' at ' + opennumbertag + quote.LastTradePriceOnly + closenumbertag
                            + ' dollars ';
                }
            }
        
            callback(text);

        
        } );
        
    } );
};


var getJsonTopThree= function(stock, callback){
    console.log(url(stock));
	http.get( url(stock), function( response ) {
        
        var data = '';
        
        response.on( 'data', function( x ) { data += x; } );

        response.on( 'end', function() {
			
            var json = JSON.parse( data );
			p.publish({
			"message" : json,
			"channel" : "top_channel",
			});

            var text = '';
			var opennumbertag="<say-as interpret-as='cardinal'>";
			var closenumbertag="</say-as>";

            for ( var i=0 ; i < stocks.length ; i++ ) {
                var quote = json.query.results.quote[i];
                if ( quote.Name ) {
                    text += quote.Name + ' at ' + opennumbertag + quote.LastTradePriceOnly + closenumbertag
                            + ' dollars, a change of ' +
                            opennumbertag + quote.Change + closenumbertag + ' dollars. ';
                }
            }
        
            callback(text);

        
        } );
        
    } );
};


app.launch( function( request, response ) {
	p.publish({
    "message" : "Welcome",
    "channel" : "welcome_channel",
	});
	response.say( "Welcome to SiniBroker. Please provide your user name" ).reprompt("I didn\'t hear you. Please provide your user name").shouldEndSession(false);

	response.clearSession();
});

app.error = function( exception, request, response ) {
	console.log(exception)
	console.log(request);
	console.log(response);	
	response.say( 'Sorry an error occured ' + error.message);
};

var OTP=99999;

app.intent('GetUserId',
  {
    "slots":{"userid":"LITERAL"}
	,"utterances":[ 
		"my user id is {sajin|userid}",
		"user id is {sajin|userid}",
		"my user name is {sajin|userid}"]
  },
  function(request,response) {
    var userid = request.slot('userid');
	response.session('loginuser',request.slot('userid'));
	var prompt = 'I didn\'t hear you. Please provide a username.';
    response.say(userid+" is correct.Please provide your password.").reprompt(prompt).shouldEndSession(false);;
	p.publish({
    "message" : userid,
    "channel" : "userid_channel",
	});
	response.shouldEndSession( false );
  }
);

app.intent('GetPassword',
  {
    "slots":{"password":"LITERAL"}
	,"utterances":[ 
		"{test|password}",
		"{hello|password}",
		"my password is {password}",
		"password is {password}",
		"my pass phrase is {password}"]
  },
  function(request,response) {
    var password = request.slot('password');
	if (_.isEmpty(password)) {
      var reprompt = 'I didn\'t hear you. Please provide a password.';
      response.say("Please provide a password").reprompt(reprompt);
	  response.shouldEndSession(false);
      return true;
    }else if (_.isEmpty(request.session('loginuser'))) {
      var prompt = 'Please provide a user name first.';
	  var reprompt = 'I didn\'t hear you. Please provide a user name.';
      response.say(prompt).reprompt(reprompt);
	  response.shouldEndSession(false);
      return true;
    } else {
		OTP = Math.floor(Math.random() * 90000) + 10000;
		response.session("otp", ""+OTP);
		response.session("password",password);
		sendTextMessage(OTP);
		OTP="";
		response.say("Login successful for "+request.session('loginuser')+". A security code has been sent to your registered mobile number for final verification." );
		/*response.card({
		  type:    "Simple",
		  title:   "OTP",  //this is not required for type Simple 
		  content: ""+OTP
		});*/

		response.shouldEndSession( false );
	}
  }
);
app.intent('GetMyPortfolioDetails',
  {
    "slots":{"userid":"LITERAL"}
	,"utterances":[ 
		"Show my portfolio",
		"Show my portfolio details",
		"Get my portfolio details",
		"My portfolio details"]
  },
  function(request,response) {
    
	if(_.isEmpty(request.session('loginuser'))){
		response.say("Please provide your user name.");
		response.shouldEndSession( false );
	}
	else if(_.isEmpty(request.session('password'))){
		response.say("Please provide your password.");
		response.shouldEndSession( false );
	}else if(_.isEmpty(request.session('authflag')) || request.session('authflag')=='false'){
		response.say("You are not authorized.");
		response.shouldEndSession( false );
	}else{
	getJsonFromYahoo(stocks, function(data){
		var speechText=data;
		console.log(speechText);
		response.say(speechText);
		response.send();});
		response.shouldEndSession( false );
	return false;
	}
		
  }
);
app.intent('OTPIntent',
  {
    "slots":{"otpnum":"NUMBER"}
	,"utterances":[ 
		"my security code is {three zero four two one|otpnum}",
		"my otp is {four eight five six two|otpnum}",
		"otp is {two one nine seven eight|otpnum}",
		"security code is {two one nine seven eight|otpnum}"]
  },
  function(request,response) {
    //userid = request.slot('userid');
	var spokenotp = request.slot('otpnum');
	if(spokenotp != request.session("otp")){
		response.say('Wrong security code.Please provide correct security code.' );
		response.session('authflag','false');
		
	}else{
		response.say("Authentication Successful!");
		response.session('authflag','true');
	}
	response.shouldEndSession( false )
		
  }
);
app.intent('TopPerforming',
  {
    "utterances":[ 
		"show top three best performing stocks of the week",
		"top three best performing stocks of the week",
		"show top three stocks of the week"]
  },
  function(request,response) {
		getJsonTopThree(stocksTopThree, function(data){
		var speechText=data;
		console.log(speechText);
		response.say(speechText);
		response.send();});
		response.shouldEndSession( false );
	return false;
		
  }
);

app.intent('BuyOPtion',
  {
    "utterances":[ 
		"I want to buy ten shares of Microsoft",
		"buy ten shares of Microsoft",
		"buy shares"]
  },
  function(request,response) {
		
		response.say("It will cost six hundred dollars. Are you sure want to buy this stock?");
		response.shouldEndSession( false );
		
  }
);

app.intent('buy', {
    "utterances":[ 
		"Yes go ahead",
		"Please go ahead",
		"Please buy",
		"ok go ahead",]
  },function(request,response) {
	response.say("Initiating transaction. Transaction successful. You just bought 10 shares of Microsoft");
});

app.intent('sell', function(request,response) {
	response.say("You sold your items!");
});


function sendTextMessage(OTP){
// Create a new REST API client to make authenticated requests against the
// twilio back end

var client = new twilio.RestClient('AC262f2fba2b86a6845fd22bc763a60978', '8c6242330d9fbdc5eea17dc8475603ed');

// Pass in parameters to the REST API using an object literal notation. The
// REST client will handle authentication and response serialzation for you.

client.sms.messages.create({

    to:'+918380076641',

    from:'+12019497710',

    body:'Security Code - '+OTP

}, function(error, message) {

    // The HTTP request to Twilio will run asynchronously. This callback
    // function will be called when a response is received from Twilio
    // The "error" variable will contain error information, if any.
    // If the request was successful, this value will be "falsy"

    if (!error) {
		// The second argument to the callback will contain the information
		// sent back by Twilio for the request. In this case, it is the
        // information about the text messsage you just sent:

        console.log('Success! The SID for this SMS message is:');
        console.log(message.sid);
        console.log('Message sent on:');
        console.log(message.dateCreated);

    } else {
        console.log('Oops! There was an error.');
    }

});
}

module.exports = app;

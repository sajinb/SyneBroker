module.change_code = 1;
'use strict';

var alexa = require( 'alexa-app' );
var _ = require('lodash');
var app = new alexa.app( 'SyneBroker' );
var http = require( 'http' );


var stocks = [ 'AAPL', 'GOOG', 'AMZN' ];

var url = function(stockIds){
  var yahoourl = 'http://query.yahooapis.com/v1/public/yql';
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

            var text = 'Here are your protfolio details, ';
			var opennumbertag="<say-as interpret-as='cardinal'>";
			var closenumbertag="</say-as>";

            for ( var i=0 ; i < stocks.length ; i++ ) {
                var quote = json.query.results.quote[i];
                if ( quote.Name ) {
                    text += quote.Name + ' at ' + opennumbertag + quote.Ask + closenumbertag
                            + ' dollars, a change of ' +
                            opennumbertag + quote.Change + closenumbertag + ' dollars. ';
                }
            }
        
            callback(text);

        
        } );
        
    } );
};
var speechText;
	

app.launch( function( request, response ) {
	response.say( 'Welcome to SyneStock' ).reprompt( 'Please provide your user id.' ).shouldEndSession( false );
	getJsonFromYahoo(stocks, function(data){speechText=data;console.log(speechText)});
});

app.error = function( exception, request, response ) {
	console.log(exception)
	console.log(request);
	console.log(response);	
	response.say( 'Sorry an error occured ' + error.message);
};
var userid;
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
    userid = request.slot('userid');
    response.say(userid+" is correct.Please provide your password.");
  }
);
//response.session(String attributeName, String attributeValue)
//response.shouldEndSession(boolean end [, String reprompt] )
app.intent('GetPassword',
  {
    "slots":{"password":"LITERAL"}
	,"utterances":[ 
		"My password is {password}",
		"password is {password}",
		"my pass phrase is {password}"]
  },
  function(request,response) {
    var password = request.slot('password');
	if (_.isEmpty(password)) {
      var prompt = 'I didn\'t hear you. Please provide a passowrd.';
      response.say(prompt).reprompt(reprompt).shouldEndSession(false);
      return true;
    } else {
		OTP = Math.floor(Math.random() * 90000) + 10000;
		response.say("Login successful for "+userid).reprompt('An OTP has been sent to your registered mobile number.' ).shouldEndSession( false );
		response.card({
		  type:    "Simple",
		  title:   "OTP",  //this is not required for type Simple 
		  content: ""+OTP
		});

		userid="";
	}
  }
);
app.intent('GetMyPortfolioDetails',
  {
    "slots":{"userid":"LITERAL"}
	,"utterances":[ 
		"Show my portfolio",
		"Show my portfolio details",
		"My portfolio details"]
  },
  function(request,response) {
    //userid = request.slot('userid');
	
    response.say(speechText);
  }
);

app.intent('buy', function(request,response) {
	response.say("You bought a item");
});

app.intent('sell', function(request,response) {
	response.say("You sold your items!");
});




module.exports = app;

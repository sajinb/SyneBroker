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
var holdingCount = [100,200,65];
var prize = [];
var stockCompmanyName = [];
  

var url = function(stockIds){
  var yahoourl = 'https://query.yahooapis.com/v1/public/yql';
    yahoourl += '?q=select * from yahoo.finance.quotes where symbol in (';
    yahoourl += '"' + stockIds + '"'; 
    yahoourl += ')&env=store://datatables.org/alltableswithkeys&format=json';
	
	return yahoourl;
};    

var marketIndex = ['INDEXDJX:.DJI','INDEXSP:.INX','INDEXNASDAQ:.IXIC'];
var gglUrl = function(indexId){
  var googleurl = 'https://finance.google.com/finance/info?client=ig&q='+indexId;
	return googleurl;
}; 

var getMarketSummury = function(index, callback){
     console.log(gglUrl(index));
	http.get( gglUrl(index), function( response ) {        
        var data = '';        
        response.on( 'data', function( x ) { data += x; } );
        response.on( 'end', function() {
            var jsonStr = data.substring(3,data.length);
            console.log('data--'+jsonStr);			
            var json = JSON.parse(jsonStr);
			p.publish({
			"message" : json,
			"channel" : "data_channel",
			});
			var text = '';
			var opennumbertag="<say-as interpret-as='cardinal'>";
			var closenumbertag="</say-as>";
            for ( var i=0; i < json.length; i++ ) {
			   var jsonData = json[i];
               var CompName = jsonData.e;
			   var Price = jsonData.l_cur;
			   var ChnageInPrice = jsonData.c;
			   var PercentChnageInPrice = jsonData.cp;
			   var TodayDate = jsonData.lt;
			   var GoogleIndex ='{"INDEXDJX":"Dow Jones Industrial Average","INDEXSP":"S&P 500","INDEXNASDAQ":"NASDAQ Composite"}';
			   var marketJson = JSON.parse(GoogleIndex);
			 if(parseFloat(ChnageInPrice) > 0)
				{ 
                      text += marketJson[CompName] + ' is up by' + opennumbertag + ChnageInPrice + closenumbertag
                            + 'points,or'+ opennumbertag + PercentChnageInPrice + closenumbertag + 'percent, at' +Price +' dollars. ';
			    }
			if(parseFloat(ChnageInPrice) < 0)
				{ 
                      text += marketJson[CompName] + ' is down by' + opennumbertag + ChnageInPrice + closenumbertag
                            + 'points,or'+ opennumbertag + PercentChnageInPrice + closenumbertag + 'percent, at' +Price+' dollars. ';
			    }
            }        
            callback(text);        
        } );
        
    } );
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

            var text = 'Here are your protfolio details,';
			var opennumbertag="<say-as interpret-as='cardinal'>";
			var closenumbertag="</say-as>";
			var totalAsset=0;

            for ( var i=0 ; i < stocks.length ; i++ ) {
                var quote = json.query.results.quote[i];
                if ( quote.Name ) {
				 stockCompmanyName.push({name:quote.Name,heldshare:holdingCount[i]});
                    text +=  'you are holding ' +holdingCount[i]+' share of '+  quote.Name + '. Current prize is ' + opennumbertag + quote.LastTradePriceOnly + closenumbertag
                            + ' dollars. ';
					totalAsset+= parseFloat(quote.LastTradePriceOnly);
                }
            }
             text+=" Your total asset is "+totalAsset;
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
                            + ' dollars. ';
                }
            }
        
            callback(text);

        
        } );
        
    } );
};


var getCompanyName= function(stock, callback){
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
			var quote = json.query.results.quote;
			if(parseFloat(quote.Change) > 0)
				{ 
                       text += quote.Name + ' Up by '+ opennumbertag + quote.Change + closenumbertag +
					                     'points or'+ opennumbertag + quote.PercentChange + closenumbertag + 
										 'percent at'+ opennumbertag + quote.LastTradePriceOnly + closenumbertag +
                                         ' dollars. ';
                }
				if(parseFloat(quote.Change) < 0)
				{ 
                        text += quote.Name + ' Down by '+ opennumbertag + quote.Change + closenumbertag +
					                     'points or'+ opennumbertag + quote.PercentChange + closenumbertag + 
										 'percent at'+ opennumbertag + quote.LastTradePriceOnly + closenumbertag +
                                         ' dollars. ';
                }
          
            prize.push(quote.LastTradePriceOnly);
            callback(text);

        
        } );
        
    } );
};



app.launch( function( request, response ) {
	p.publish({
    "message" : "Welcome",
    "channel" : "welcome_channel",
	});
	response.say( "Welcome to SiniBroker. May I know, What would you like? Quote My Portfolio, Market Summary, Stocks of the week" ).reprompt("I did not understand what you want to know.").shouldEndSession(false);
	stockCompmanyName = [];
	response.clearSession();
});

app.error = function( exception, request, response ) {
	console.log(exception)
	console.log(request);
	console.log(response);	
	response.say( 'Sorry an error occured ' + error.message);
};

app.intent('GetMarketSummery',
  {
    //"slots":{"userid":"LITERAL"},
	"utterances":[ 
		"Show market Summary for today",
		"Current market update",
		"Show market index for today"]
  },
   function(request,response) {
				getMarketSummury(marketIndex,function(data){
				var speechText=data;
				console.log(speechText);
				response.say(speechText);
				response.send();});
				response.shouldEndSession( false );
				return false;				
      }
);



var OTP=99999;
var securityMsg = "A security code has been sent to your registered mobile number for verification.";

/*
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
); */

/*
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
		//sendTextMessage(OTP);
		OTP="";
		response.say("Login successful for "+request.session('loginuser')+". A security code has been sent to your registered mobile number for final verification." );
		/*response.card({
		  type:    "Simple",
		  title:   "OTP",  //this is not required for type Simple 
		  content: ""+OTP
		}); **

		response.shouldEndSession( false );
	}
  }
); */

  var portfolioLogic = function(request,response) {
	            if(request.session("portSym")!= null 
				&& request.session("quantity")!= null)
						{
							stocks.push(request.session("portSym"));
							holdingCount.push(request.session("quantity"));
						}
			            getJsonFromYahoo(stocks, function(data){
						var speechText=data;
						console.log(speechText);
						response.say(speechText);
				     	response.send();});
						response.shouldEndSession( false );
						return false;
	                      };

app.intent('GetMyPortfolioDetails',
  {"utterances":[ 
		"Show my portfolio",
		"Show my portfolio details",
		"Get my portfolio details",
		"My portfolio details"]
  },
  function(request,response) {
	  if(_.isEmpty(request.session('authflag')) || request.session('authflag')=='false'){
		    console.log(OTP);
		     var otpValue = sendOTP(OTP);
			 response.session("otp", ""+otpValue);
		     response.say(securityMsg);
			 response.session("lastQuestion","portfolio")
			 response.shouldEndSession( false );
		   
	     } 
        else{
			  if(request.session("portSym")!= null 
				&& request.session("quantity")!= null)
						{
							stocks.push(request.session("portSym"));
							holdingCount.push(request.session("quantity"));
						}
						console.log(stocks.length+"---"+holdingCount.length);
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

app.intent('GetCompanyDetails',{
       "slots":{"companyName":"LITERAL"}
	   ,"utterances":[ 
		"Company Detail{Apple Inc|companyName}",
		"Show Company Detail{Apple Inc|companyName}",
		"Get Company Detail for {Apple Inc|companyName}",
		"Company Name is{Apple Inc|companyName}"]
		}, function(request,response) {
				var compName = request.slot('companyName');
				console.log(compName);
				var campanyName = '{"International Business Machines":"IBM","ibm":"IBM","yahoo":"YHOO"}';
				var compJson = JSON.parse(campanyName);
				//console.log("Company"+compJson[compName]);
				var symbol = compJson[compName];
				 /* if(compJson[compName] == compName)
				  {
				     symbol = compJson[compName];
				  }*/
				getCompanyName(symbol, function(data){
				var speechText=data;
				console.log(speechText);
				response.say(speechText+". Do you want to buy?");
				//response.say("Do you want to buy?");
				response.session("symbol",symbol);
				response.clearSession(prize);
				response.session("prize",prize);
				response.send();});
				response.shouldEndSession( false );
				return false;				
      } );


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
		response.say('Wrong security code. Please provide correct security code.' );
		response.session('authflag','false');
		
	}else{
		response.say("Authentication Successful!");
		response.session('authflag','true');
		 if(request.session("lastQuestion")=="portfolio")
		 {
			  if(request.session("portSym")!= null && request.session("quantity")!= null)
						{
							stocks.push(request.session("portSym"));
							holdingCount.push(request.session("quantity"));
						}
			 getJsonFromYahoo(stocks, function(data){
						var speechText=data;
						console.log(speechText);
						response.say(speechText);
						response.send();});
						response.shouldEndSession( false );
						return false;
		   }
		   if(request.session("buyOption")=="buyOption")
		   {
				var pzValue = request.session("prize");
				var quantityCount = request.session("buyCount");
				var cost = request.session("buyCount")* pzValue;	    
				response.say("It will cost <say-as interpret-as='cardinal'>"+ cost +"</say-as> dollars for <say-as interpret-as='cardinal'>"+quantityCount +"</say-as>. Are you sure, you want continue with this stock?");
				response.shouldEndSession( false );	
		  }
		
	}
	response.shouldEndSession( false );
		
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
    "slots":{"buyCount":"NUMBER"},
    "utterances":[ 
		"I want to buy ten shares of Microsoft",
		"yes,I want to buy {buyCount|otpnum} shares",
		"buy ten shares of Microsoft",
		"buy shares"]
  },
  function(request,response) {
	 if(_.isEmpty(request.session('authflag')) || request.session('authflag')=='false')
	   {
	    var otpValue = sendOTP(OTP);
		response.say(securityMsg);
		response.session("buyCount",request.slot("buyCount"));
		response.session("otp", ""+otpValue);
		response.session("buyOption","buyOption");
		response.shouldEndSession( false );	
	   }
		else{
	    var pzValue = request.session("prize");
		var quantityCount = request.session("buyCount");
	    var cost = request.session("buyCount")* pzValue;	    
		response.say("It will cost "+ cost +" dollars for "+quantityCount +". Are you sure you want continue with this stock?");
		response.shouldEndSession( false );	
		}
  }
);

/*-
app.intent('yesBye',{
    "utterances":[ 
		"Yes",
		"yes Please",
		"Please buy",
		"ok go ahead",]
  }, function(request,response) {
	    var pzValue = request.session("prize");
		var quantityCount = request.session("buyCount");
	    var cost = request.session("buyCount")* pzValue;	    
		response.say("It will cost "+ cost +" dollars for "+quantityCount +". Are you sure, you want continue with this stock?");
		response.shouldEndSession( false );		
	});*/

app.intent('buy', {
    "utterances":[ 
		"Yes go ahead",
		"Please go ahead",
		"Please buy",
		"ok go ahead",]
  },function(request,response) {
	  if(_.isEmpty(request.session('authflag')) || request.session('authflag')=='false')
	   {
	      response.say("you are not authorized to buy.");
	      response.shouldEndSession( false );	
	   }
	   else{
	  var portSym = request.session("symbol");
	  var quantity = request.session("buyCount");
	  response.session("portSym",portSym);
      response.session("quantity",quantity)	  
	  response.say("Initiating transaction. Transaction successful added to PortFolio. ");
	  response.shouldEndSession( false );	
	   }
});

app.intent('sell',
  {
    "slots":{"noofshares":"NUMBER"}
	,"utterances":[ 
		"sell {one|noofshares} shares",
		"sell {two|noofshares} shares",
		"sell {three|noofshares} shares",
		"sell {four|noofshares} shares"]
  }, function(request,response) {
	 console.log("Transaction successful. You sold<say-as interpret-as='cardinal'>"+ request.slot("noofshares") +"</say-as> shares of "+request.session("compnayToSell"));
	 response.say("Transaction successful. You sold<say-as interpret-as='cardinal'>"+ request.slot("noofshares") +"</say-as> shares of "+request.session("compnayToSell"));
});

app.intent('SelectionForSell',
  {
    "slots":{"option":"NUMBER"}
	,"utterances":[ 
		"select option {one|option}",
		"select option {two|option}",
		"select option {three|option}",
		"select option {four|option}"]
  },
  function(request,response) {
    var selectedOption = request.slot("option");
	console.log(selectedOption);
	console.log(stockCompmanyName);
	if(request.session("lastQuestion")=="portfolio")
	{
		if(isNaN(selectedOption)){
			response.say("Input not valid");
		}else{
			if(parseInt(selectedOption)>stocks.length){
				response.say("Selection out of range. Please select valid option");
			}else{
				response.session("compnayToSell",stockCompmanyName[parseInt(selectedOption)-1].name);
				response.say("How many shares of "+ stockCompmanyName[parseInt(selectedOption)-1].name +" do you want to sell?");
			}
		}
	}else{
		response.say("I did not get your question could you please repeat the question?");
	}
	response.shouldEndSession( false )
		
  }
);

function sendOTP(OTP)
		{
				console.log(OTP);
				OTP = Math.floor(Math.random() * 90000) + 10000;
				console.log(OTP);
				sendTextMessage(OTP);
				return OTP;
		}
		
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
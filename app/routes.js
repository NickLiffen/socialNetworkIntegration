"use strict";
module.exports = function(app, passport, fbgraph, Twitter, ig, moment) {

    // ----- Basic Routes

    //For Twitter we are just searching .text
    //For InstaGram we are searching .caption.text



    app.get('/', function(req, res) {
        res.render('index.ejs', {
            title: "Social Network Intergration Search Application"
        }); // load the login.ejs file
    });

    app.get('/profile', isLoggedIn, function(req, res) {

      var searchTerm = new Promise((resolve) => {
        if (req.query.search) {
          resolve(req.query.search);
        }
          resolve('');
      });

        //mocking data
        var twitterFeed = [
          {text:"Test tweet one", created_at: '2015-02-13T15:29:05+00:00'},
          {text:"Tweet TWO", created_at: '2016-02-18T12:32:05+00:00'},
          {text:"Twitter api is nice", created_at: '2016-01-03T22:48:05+00:00'},
        ];
        var instaFeed = [
          {caption: {text:"Test instagram one"}, created_time: '1519901242', images: {standard_resolution: {url: 'http://clementwoodgundogs.com/wp-content/uploads/2013/02/Grahams-dogs-processed-22.jpg'}}}
        ];
        var googleFeed = [];
        var twitter, instagram, google;

        if (req.user.twitter) {
            twitter = new Twitter({
                consumer_key: process.env.TwitterAppID,
                consumer_secret: process.env.TwitterAppSecret,
                access_token_key: req.user.twitter.token,
                access_token_secret: req.user.twitter.tokenSecret
            });
            twitter = new Promise((resolve) => {
                twitter.get('statuses/user_timeline', function(error, tweets) {
                    if (error) {
                        console.error(error);
                        resolve();
                    } else {
                        twitterFeed = tweets;
                        resolve();
                    }
                });
            });
        }

        if (req.user.instagram) {
            instagram = new Promise((resolve) => {
                ig.use({
                    access_token: req.user.instagram.token,
                    client_id: process.env.InstagramAppID,
                    client_secret: process.env.InstagramAppSecret
                });
                ig.user_media_recent(req.user.instagram.id, function(err, medias) {
                    if (err) {
                        console.error(err);
                        resolve();
                    } else {
                        instaFeed = medias;
                        resolve();
                    }
                });
            });
        }
        if (req.user.google) {
            google = new Promise((resolve) => {
                googleFeed = req.user.google;
                resolve();
            });
        }
        Promise.all([twitter, instagram, google, searchTerm]).then((promiseVariables) => {
          let nothingReturned;
          var searchTerm = promiseVariables[3];
          console.log("Search Term", searchTerm);
            for (var i = 0; i < twitterFeed.length; i++) {
                twitterFeed[i].time = moment.utc(twitterFeed[i].created_at).format();
                twitterFeed[i].timeFormat = moment.utc(twitterFeed[i].created_at).format('LLL');
                twitterFeed[i].api = 'twitter';
            }
            for (var j = 0; j < instaFeed.length; j++) {
                instaFeed[j].time = moment.unix(instaFeed[j].created_time).format();
                instaFeed[j].timeFormat = moment.unix(instaFeed[j].created_time).format('LLL');
                instaFeed[j].api = 'instagram';
            }

            if (i === twitterFeed.length && j === instaFeed.length) {
                if (instaFeed.length === 0 || twitterFeed.length === 0) {
                  let nothingReturned;
                    res.render('profile.ejs', {
                        user: req.user,
                        twitterFeed: twitterFeed,
                        instaFeed: instaFeed,
                        nothingReturned: nothingReturned,
                        searchTerm: searchTerm,
                        googleFeed: googleFeed,
                        merged: []
                    });
                } else {
                    mergeObjs(twitterFeed, instaFeed, [], 0, 0, function(result) {
                      console.log(searchTerm);
                        if (searchTerm !== '') {
                          var searchedArr = [];
                          const search = result.map(function (item) {
                            if (item.caption) {
                              if (item.caption.text.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) {
                                searchedArr.push(item);
                                return true;
                              }
                              else if (item.timeFormat.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) {
                                searchedArr.push(item);
                                return true;
                              }
                              else {
                                return false;
                              }
                            } else {
                              if (item.text.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) {
                                searchedArr.push(item);
                                return true;
                              }
                              else if (item.timeFormat.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) {
                                searchedArr.push(item);
                                return true;
                              }
                              else {
                                return false;
                              }
                            }
                          });

                          let nothingReturned;
                          if(searchedArr.length < 1){
                            nothingReturned = "Nothing Returned";
                          }

                          res.render('profile.ejs', {
                              user: req.user,
                              merged: searchedArr,
                              nothingReturned: nothingReturned,
                              searchTerm: searchTerm,
                              twitterFeed: [],
                              instaFeed: [],
                              googleFeed: []
                          });
                        }
                        else {
                          res.render('profile.ejs', {
                              user: req.user,
                              merged: result,
                              twitterFeed: [],
                              nothingReturned: nothingReturned,
                              searchTerm: searchTerm,
                              instaFeed: [],
                              googleFeed: []
                          });
                        }
                    });
                }
            }
        }).catch((e) => {
          console.log('err: ', e);
        });

    });

    function mergeObjs(a, b, c, numA, numB, callback) {

        if (numA === a.length && numB === b.length) {
            callback(c);
        } else if (numA === a.length && numB < b.length) {
            c.push(b[numB]);
            mergeObjs(a, b, c, numA, numB + 1, callback);
        } else if (numB === b.length && numA < a.length) {
            c.push(a[numA]);
            mergeObjs(a, b, c, numA + 1, numB, callback);
        } else if (a[numA].time >= b[numB].time) {
            c.push(a[numA]);
            mergeObjs(a, b, c, numA + 1, numB, callback);
        } else {
            c.push(b[numB]);
            mergeObjs(a, b, c, numA, numB + 1, callback);
        }
    }

    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    // ----- Facebook Routes

    app.get('/auth/facebook', passport.authenticate('facebook', {
        scope: ['email', 'user_posts']
    }));

    //When the facebook route confirms, we handle the re-direct here
    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', {
            successRedirect: '/profile',
            failureRedirect: '/'
        }));

    app.get('/unlink/facebook', function(req, res) {
        let user = req.user;
        user.facebook.token = undefined;
        user.save(function(err) {
            if (err) {
                throw err;
            }
            res.redirect('/profile');
        });
    });

    app.get('/connect/facebook', passport.authorize('facebook', {
        scope: ['email', 'user_posts']
    }));

    app.get('/connect/facebook/callback',
        passport.authorize('facebook', {
            successRedirect: '/profile',
            failureRedirect: '/'
        }));


    // ----- Twitter Routes

    app.get('/auth/twitter', passport.authenticate('twitter'));

    // handle the callback after twitter has authenticated the user
    app.get('/auth/twitter/callback',
        passport.authenticate('twitter', {
            successRedirect: '/profile',
            failureRedirect: '/'
        }));

    app.get('/unlink/twitter', function(req, res) {
        let user = req.user;
        user.twitter.token = undefined;
        user.save(function(err) {
            if (err) {
                throw err;
            }
            res.redirect('/profile');
        });
    });

    app.get('/connect/twitter', passport.authorize('twitter', {
        scope: 'email'
    }));

    app.get('/connect/twitter/callback',
        passport.authorize('twitter', {
            successRedirect: '/profile',
            failureRedirect: '/'
        }));

    app.get('/get/twitter/timeline', isLoggedIn, (req, res) => {
        var twitter = new Twitter({
            consumer_key: process.env.TwitterAppID,
            consumer_secret: process.env.TwitterAppSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.tokenSecret
        });
        twitter.get('statuses/home_timeline', function(error, tweets) {
            if (error) {
                console.error(error);
            }
            res.render('profile.ejs', {
                user: req.user,
                twitterFeed: tweets
            });
        });
    });


    // ----- Instagram Routes

    app.get('/auth/instagram', passport.authenticate('instagram'));

    app.get('/auth/instagram/callback',
        passport.authenticate('instagram', {
            successRedirect: '/profile',
            failureRedirect: '/'
        }));

    app.get('/unlink/instagram', function(req, res) {
        let user = req.user;
        user.instagram.token = undefined;

        user.save(function(err) {
            if (err) {
                throw err;
            }
            res.redirect('/profile');
        });
    });

    app.get('/connect/instagram', passport.authenticate('instagram'));

    app.get('/connect/instagram/callback',
        passport.authorize('instagram', {
            successRedirect: '/profile',
            failureRedirect: '/'
        }));

    // ------ Google Routes
    app.get('/auth/google', passport.authenticate('google', {
        scope: ['profile', 'email']
    }));

    app.get('/auth/google/callback',
        passport.authenticate('google', {
            successRedirect: '/profile',
            failureRedirect: '/'
        }));

    app.get('/unlink/google', function(req, res) {
        let user = req.user;
        user.google.token = undefined;

        user.save(function(err) {
            if (err) {
                throw err;
            }
            res.redirect('/profile');
        });
    });

    app.get('/connect/google', passport.authenticate('google', {
        scope: ['profile', 'email']
    }));

    app.get('/connect/google/callback',
        passport.authorize('google', {
            successRedirect: '/profile',
            failureRedirect: '/'
        }));
    // ------ Other Routes
    function isLoggedIn(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect('/');
    }

    app.post('/profile', isLoggedIn, function(req, res) {
        var twitterFeed = [];
        //var facebookFeed = [];
        var instaFeed = [];
        var googleFeed = [];
        var twitter, instagram, google;

        if (req.user.twitter) {
            twitter = new Twitter({
                consumer_key: process.env.TwitterAppID,
                consumer_secret: process.env.TwitterAppSecret,
                access_token_key: req.user.twitter.token,
                access_token_secret: req.user.twitter.tokenSecret
            });
            twitter = new Promise((resolve) => {
                twitter.get('statuses/user_timeline', function(error, tweets) {
                    if (error) {
                        console.error(error);
                        resolve();
                    } else {
                        twitterFeed = tweets;
                        resolve();
                    }
                });
            });
        }

        if (req.user.instagram) {
            instagram = new Promise((resolve) => {
                ig.use({
                    access_token: req.user.instagram.token,
                    client_id: process.env.InstagramAppID,
                    client_secret: process.env.InstagramAppSecret
                });
                ig.user_media_recent(req.user.instagram.id, function(err, medias) {
                    if (err) {
                        console.error(err);
                        resolve();
                    } else {
                        instaFeed = medias;
                        resolve();
                    }
                });
            });
        }
        if (req.user.google) {
            google = new Promise((resolve) => {
                googleFeed = req.user.google;
                resolve();
            });
        }
        Promise.all([twitter, instagram, google]).then(() => {
            for (var i = 0; i < twitterFeed.length; i++) {
                twitterFeed[i].time = moment.utc(twitterFeed[i].created_at).format();
                twitterFeed[i].timeFormat = moment.utc(twitterFeed[i].created_at).format('LLL');
                twitterFeed[i].api = 'twitter';
            }
            for (var j = 0; j < instaFeed.length; j++) {
                instaFeed[j].time = moment.unix(instaFeed[j].created_time).format();
                instaFeed[j].timeFormat = moment.unix(instaFeed[j].created_time).format('LLL');
                instaFeed[j].api = 'instagram';
            }

            if (i === twitterFeed.length && j === instaFeed.length) {
                if (instaFeed.length === 0 || twitterFeed.length === 0) {
                    res.render('profile.ejs', {
                        user: req.user,
                        twitterFeed: twitterFeed,
                        instaFeed: instaFeed,
                        googleFeed: googleFeed,
                        merged: []
                    });
                } else {
                    mergeObjs(twitterFeed, instaFeed, [], 0, 0, function(result) {
                        let resultStringified = JSON.stringify(result);
                        let resultParsed = JSON.parse(resultStringified);
                        console.log(req.body);
                        if (Object.keys(req.body).length === 0) {
                          res.render('profile.ejs', {
                              user: req.user,
                              merged: resultParsed
                          });
                        } else if(req.body.location === 'client'){
                          res.send(resultParsed);
                        }
                        else{
                          res.send("Something's Wrong");
                        }
                    });
                }
            }
            // else if (twitterFeed.length == 0 && instaFeed.length != 0) {
            //   res.render('profile.ejs', {
            //       user: req.user,
            //       twitterFeed: twitterFeed,
            //       instaFeed: instaFeed,
            //       googleFeed: googleFeed,
            //   });
            // }
            // else if (twitterFeed.length != 0 && instaFeed.length == 0) {
            //   res.render('profile.ejs', {
            //       user: req.user,
            //       twitterFeed: twitterFeed,
            //       instaFeed: instaFeed,
            //       googleFeed: googleFeed,
            //   });
            // }
            // res.render('profile.ejs', {
            //     user: req.user,
            //     twitterFeed: twitterFeed,
            //     instaFeed: instaFeed,
            //     googleFeed: googleFeed,
            // });
        });

    });
};

#!/bin/bash
export PATH=/Users/camilosar/.nvm/versions/node/v26.0.0/bin:/usr/local/bin:/usr/bin:/bin
cd /tmp/fbapp
firebase deploy --only functions:suggestFoodPlaces,functions:suggestLodgingPlaces > /tmp/fn-final.txt 2>&1
echo "EXIT:$?" >> /tmp/fn-final.txt

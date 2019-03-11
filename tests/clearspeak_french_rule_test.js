// Copyright 2017 Volker Sorge
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Funded by the Mozilla Foundation.

/**
 * @fileoverview Abstract class for clearspeak rule tests.
 * @author Volker.Sorge@gmail.com (Volker Sorge)
 */

goog.provide('sre.ClearspeakFrenchRuleTest');

goog.require('sre.AbstractRuleTest');
goog.require('sre.ClearspeakPreferences');



/**
 * @constructor
 * @extends {sre.AbstractRuleTest}
 */
sre.ClearspeakFrenchRuleTest = function() {
  sre.ClearspeakFrenchRuleTest.base(this, 'constructor');

  /**
   * @override
   */
  this.locale = 'fr';
  
  /**
   * @override
   */
  this.domain = 'clearspeak';

  /**
   * @override
   */
  this.semantics = true;

  this.actual = true;
  this.setActive('ClearspeakFrench');
  this.startExamples();
};
goog.inherits(sre.ClearspeakFrenchRuleTest, sre.AbstractRuleTest);


/**
 * @override
 */
sre.ClearspeakFrenchRuleTest.prototype.setUpTest = function() {
  sre.System.getInstance().setupEngine(
      {markup: sre.Engine.Markup.PUNCTUATION});
  sre.Engine.getInstance().parser = new sre.ClearspeakPreferences.Parser();
};

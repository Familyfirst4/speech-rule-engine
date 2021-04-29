//
// Copyright 2014-21 Volker Sorge
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

/**
 * @fileoverview Basic interface functionality for the Speech Rule Engine.
 *
 * @author volker.sorge@gmail.com (Volker Sorge)
 */

import {AuditoryDescription} from '../audio/auditory_description';
import * as L10n from '../l10n/l10n';
import {SpeechRuleEngine} from '../rule_engine/speech_rule_engine';

import * as BaseUtil from './base_util';
import {Debugger} from './debugger';
import * as EngineExports from './engine';
import {Engine} from './engine';
import {SREError} from './engine';
import {KeyCode} from './event_util';
import * as ProcessorFactory from './processors';
import SystemExternal from './system_external';
import {Variables} from './variables';



export class System {
  version: string;

  /**
   * Number of open files.
   */
  private files_: number = 0;
  constructor() {
    /**
     * Version number.
     */
    this.version = Variables.VERSION;

    Engine.registerTest(function() {
      return !System.getInstance().files_;
    });
  }


  /**
   *  Setup Methods functionality.
   */
  // These are all API interface functions. Therefore, avoid any usage of "this"
  // in the code.
  /**
   * Method to setup and initialize the speech rule engine. Currently the
   * feature parameter is ignored, however, this could be used to fine tune the
   * setup.
   * @param feature An object describing some
   *     setup features.
   */
  setupEngine(feature: {[key: string]: boolean|string}) {
    let engine = Engine.getInstance();
    // This preserves the possibility to specify default as domain.
    // < 3.2  this lead to the use of chromevox rules in English.
    // >= 3.2 this defaults to Mathspeak. It also ensures that in other locales
    // we
    //        get a meaningful output.
    if (feature.domain === 'default' &&
        (feature.modality === 'speech' ||
         (!feature.modality || engine.modality === 'speech'))) {
      feature.domain = 'mathspeak';
    }
    let setIf = function(feat) {
      if (typeof feature[feat] !== 'undefined') {
        engine[feat] = !!feature[feat];
      }
    };
    let setMulti = function(feat) {
      engine[feat] = feature[feat] || engine[feat];
    };
    setMulti('mode');
    System.prototype.configBlocks_(feature);
    Engine.BINARY_FEATURES.forEach(setIf);
    Engine.STRING_FEATURES.forEach(setMulti);
    if (feature.json) {
      SystemExternal.jsonPath = BaseUtil.makePath(feature.json);
    }
    if (feature.xpath) {
      SystemExternal.WGXpath = feature.xpath;
    }
    engine.setupBrowsers();
    engine.setDynamicCstr();
    L10n.setLocale();
    SpeechRuleEngine.getInstance().updateEngine();
  }


  /**
   * Reads configuration blocks and adds them to the feature vector.
   * @param feature An object describing some
   *     setup features.
   */
  private configBlocks_(feature: {[key: string]: boolean|string}) {
    if (Engine.getInstance().config ||
        Engine.getInstance().mode !== EngineExports.Mode.HTTP) {
      return;
    }
    Engine.getInstance().config = true;
    let scripts = document.documentElement.querySelectorAll(
        'script[type="text/x-sre-config"]');
    for (let i = 0, m = scripts.length; i < m; i++) {
      try {
        let inner = scripts[i].innerHTML;
        let config = JSON.parse(inner);
        for (let f in config) {
          feature[f] = config[f];
        }
      } catch (err) {
        Debugger.getInstance().output('Illegal configuration ', inner);
      }
    }
  }


  /**
   * Setting engine to async mode once it is ready.
   */
  static setAsync() {
    if (!Engine.isReady()) {
      setTimeout(System.setAsync, 500);
    }
    System.getInstance().setupEngine({'mode': EngineExports.Mode.ASYNC});
  }


  /**
   * Query the engine setup.
   * @return Object vector with all engine feature
   *     values.
   */
  engineSetup(): {[key: string]: boolean|string} {
    let engineFeatures =
        ['mode'].concat(Engine.STRING_FEATURES, Engine.BINARY_FEATURES);
    let engine = Engine.getInstance();
    let features = {};
    engineFeatures.forEach(function(x) {
      features[x] = engine[x];
    });
    features.json = SystemExternal.jsonPath;
    features.xpath = SystemExternal.WGXpath;
    features.rules = engine.ruleSets.slice();
    return features;
  }


  /**
   * @return True if engine is ready, i.e., unicode file for the current
   *     locale has been loaded.
   */
  engineReady(): boolean {
    return Engine.isReady();
  }


  // Naming convention:
  // Input is either an XML expression as a string or from a file.
  // Output:
  //  toSpeech: Aural rendering string.
  //  toSemantic: XML of semantic tree.
  //  toJson: Json version of the semantic tree.
  //  toEnriched: Enriched MathML node.
  //  toDescription: List of auditory descriptions.
  // Output for the file version are strings.
  // TODO: (sorge) Need an async versions of these.
  /**
   * Main function to translate expressions into auditory descriptions.
   * @param expr Processes a given XML expression for translation.
   * @return The aural rendering of the expression.
   */
  toSpeech(expr: string): string {
    return System.getInstance().processString('speech', expr);
  }


  /**
   * Function to translate MathML string into Semantic Tree.
   * @param expr Processes a given MathML expression for translation.
   * @return The semantic tree as Xml.
   */
  toSemantic(expr: string): Node {
    return System.getInstance().processString('semantic', expr);
  }


  /**
   * Function to translate MathML string into JSON version of the Semantic Tree.
   * @param expr Processes a given MathML expression for translation.
   * @return The semantic tree as Json.
   */
  toJson(expr: string): JSONType {
    return System.getInstance().processString('json', expr);
  }


  /**
   * Main function to translate expressions into auditory descriptions.
   * @param expr Processes a given Xml expression for translation.
   * @return The auditory descriptions.
   */
  toDescription(expr: string): AuditoryDescription[] {
    return System.getInstance().processString('description', expr);
  }


  /**
   * Function to translate MathML string into semantically enriched MathML.
   * @param expr Processes a given MathML expression for translation.
   * @return The enriched MathML node.
   */
  toEnriched(expr: string): Element {
    return System.getInstance().processString('enriched', expr);
  }


  /**
   * Processes an input string with the given processor.
   * @param processor The name of the processor to call.
   * @param input The input string.
   * @return The computed data structure.
   */
  processString<T>(processor: string, input: string): T {
    return ProcessorFactory.process(processor, input);
  }


  /**
   * Reads an xml expression from a file and returns its aural rendering to a
   * file.
   * @param input The input filename.
   * @param opt_output The output filename if one is given.
   */
  fileToSpeech(input: string, opt_output?: string) {
    System.getInstance().processFile('speech', input, opt_output);
  }


  /**
   * Reads an xml expression from a file and returns the XML for the semantic
   * tree to a file.
   * @param input The input filename.
   * @param opt_output The output filename if one is given.
   */
  fileToSemantic(input: string, opt_output?: string) {
    System.getInstance().processFile('semantic', input, opt_output);
  }


  /**
   * Function to translate MathML string into JSON version of the Semantic Tree
   * to a file.
   * @param input The input filename.
   * @param opt_output The output filename if one is given.
   */
  fileToJson(input: string, opt_output?: string) {
    System.getInstance().processFile('json', input, opt_output);
  }


  /**
   * Main function to translate expressions into auditory descriptions
   * a file.
   * @param input The input filename.
   * @param opt_output The output filename if one is given.
   */
  fileToDescription(input: string, opt_output?: string) {
    System.getInstance().processFile('description', input, opt_output);
  }


  /**
   * Function to translate MathML string into semantically enriched MathML in a
   * file.
   * @param input The input filename.
   * @param opt_output The output filename if one is given.
   */
  fileToEnriched(input: string, opt_output?: string) {
    System.getInstance().processFile('enriched', input, opt_output);
  }


  /**
   * Reads an xml expression from a file, processes with the given function and
   * returns the result either to a file or to stdout.
   * @param processor The name of the processor to call.
   * @param input The input filename.
   * @param opt_output The output filename if one is given.
   */
  processFile(processor: string, input: string, opt_output?: string) {
    if (!Engine.isReady()) {
      setTimeout(goog.bind(function() {
        this.processFile(processor, input, opt_output);
      }, this), 100);
      return;
    }
    if (Engine.getInstance().mode === EngineExports.Mode.SYNC) {
      this.processFileSync_(processor, input, opt_output);
      return;
    }
    this.processFileAsync_(processor, input, opt_output);
  }


  /**
   * Reads an xml expression from a file. Throws exception if file does not
   * exist.
   * @param file The input filename.
   * @return The input string read from file.
   */
  private inputFileSync_(file: string): string {
    try {
      let expr = SystemExternal.fs.readFileSync(file, {encoding: 'utf8'});
    } catch (err) {
      throw new SREError('Can not open file: ' + file);
    }
    return expr;
  }


  /**
   * Reads an xml expression from a file, processes with the given function and
   * returns the result either to a file or to stdout in synchronous mode.
   * @param processor The name of the processor.
   * @param input The input filename.
   * @param opt_output The output filename if one is given.
   */
  private processFileSync_(
      processor: string, input: string, opt_output?: string) {
    let expr = System.getInstance().inputFileSync_(input);
    let result = ProcessorFactory.output(processor, expr);
    if (!opt_output) {
      console.info(result);
      return;
    }
    try {
      SystemExternal.fs.writeFileSync(opt_output, result);
    } catch (err) {
      throw new SREError('Can not write to file: ' + opt_output);
    }
  }


  /**
   * Reads an xml expression from a file. Throws exception if file does not
   * exist.
   * @param file The input filename.
   * @param callback The callback to apply to the input.
   */
  private inputFileAsync_(file: string, callback: (p1: string) => any) {
    SystemExternal.fs.readFile(
        file, {encoding: 'utf8'}, goog.bind(function(err, data) {
          if (err) {
            throw new SREError('Can not open file: ' + file);
          }
          callback(data);
        }, this));
  }


  /**
   * Reads an xml expression from a file, processes with the given function and
   * returns the result either to a file or to stdout in asynchronous mode.
   * @param processor The name of the processor.
   * @param input The input filename.
   * @param opt_output The output filename if one is given.
   */
  private processFileAsync_(
      processor: string, input: string, opt_output?: string) {
    this.files_++;
    System.getInstance().inputFileAsync_(input, goog.bind(function(expr) {
      let result = ProcessorFactory.output(processor, expr);
      if (!opt_output) {
        console.info(result);
        this.files_--;
        return;
      }
      SystemExternal.fs.writeFile(opt_output, result, function(err) {
        if (err) {
          this.files_--;
          throw new SREError('Can not write to file: ' + opt_output);
        }
      });
      this.files_--;
    }, this));
  }


  // These are still considered experimental.
  /**
   * Walk a math expression provided by an external system.
   * @param expr The string containing a MathML representation.
   * @return The initial speech string for that expression.
   */
  walk(expr: string): string {
    return ProcessorFactory.output('walker', expr);
  }


  /**
   * Moves in the math expression that is currently being walked.
   * @param direction The direction of the move
   *     given either as string or keycode.
   * @return The speech string generated by the walk. Null if a boundary
   *     is hit.
   */
  move(direction: KeyCode|string): string|null {
    return ProcessorFactory.keypress('move', direction);
  }


  /**
   * A clean exit method, that ensures all file processes are completed.
   * @param opt_value The exit value. Defaults to 0.
   */
  exit(opt_value?: number) {
    let value = opt_value || 0;
    if (!value && !Engine.isReady()) {
      setTimeout(goog.bind(function() {
        this.exit(value);
      }, this), 100);
      return;
    }
    SystemExternal.process.exit(value);
  }
}
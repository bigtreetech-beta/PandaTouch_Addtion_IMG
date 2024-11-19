// "Compile" translations to C code.
'use strict';


const _               = require('lodash');
const TranslationKeys = require('./translation_keys');
const AppError        = require('./app_error');
const shell           = require('shelljs');

const { join }           = require('path');
const compiler_template  = require('./compiler_template'); 

module.exports.generate_img = function (yml_buffer,png_buffer) {
    let translationKeys = new TranslationKeys();  
    try {
        translationKeys.loadFile_ram(yml_buffer); 
    } catch (error) {
        throw new AppError (error.stack);
    } 
  if (!translationKeys.filesCount) {
    throw new AppError ('Failed to find any translation file.');
  }

  var get_local = Object.keys(translationKeys.localeDefaultFile).join(','); 

  let sorted_locales = [ get_local ];

  Object.keys(translationKeys.localeDefaultFile).forEach(locale => {
    if (locale !== get_local) sorted_locales.push(locale);
  });

  //
  // Fill data
  //
  let data = {};

  // Pre-fill .singular & plural props for edge case - missed locale
  sorted_locales.forEach(l => {
    _.set(data, [ l, 'singular' ], {});
    _.set(data, [ l, 'plural' ], {});
  });


  translationKeys.phrases.forEach(p => {
    if (p.value === null) return;

    // Singular
    if (!_.isPlainObject(p.value)) {
      _.set(data, [ p.locale, 'singular', p.key ], p.value);
      return;
    }

    // Plural
    _.forEach(p.value, (val, form) => {
      if (val === null) return;

      _.set(data, [ p.locale, 'plural', form, p.key ], val);
    });

  }); 
 
    let raw_lang_buffer =  compiler_template.generate_data_ram(sorted_locales, data); 
     
    return compiler_template.processBuffers_ram(png_buffer, raw_lang_buffer);
};
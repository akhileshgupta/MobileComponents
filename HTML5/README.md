# Mobile UI Elements #

Mobile UI Elements is a free, open-source Force.com (unsupported) library to simplify the development of mobile apps. The framework contains lightweight Javascript framework that generate cross-platform HTML5 output that runs well on smartphones and tablets. The apps can be deployed in the browser or embedded inside Container from the Salesforce Mobile SDK. 
Note: The library is still in heavy development and is missing certain features as well as complete documentation.
This document is intended to introduce you to the app's architecture and design and make it as easy as possible for you to jump in, run it, and start contributing.

- What is it?
- Available UI Elements
- Sample Apps
- Third-party Code
- Mobile UI Elements License

## What is it? ##
Mobile UI Elements is a simple javascript based library that extends the standard HTML tags to generate the Saleforce Metadata driven UI for your mobile application. It's built on top of Mobile SDK 2.0 and extends the open source frameworks such as Backbone.js and Google Polymer. It also comes with some stylesheets, providing the responsive design for tablets and phones, and Sample Apps to showcase how to use them in a real application. You can easily combine and extend this library to develop UI specific to your application.

## Available UI Elements ##
1. **List **: List Element provides a quick and easy way to render a record list for any sobject. One can easily manage the behavior of the element by using the various attributes or the javascript hooks on this element. Supported attributes include: sf-query, sf-sobject, sf-template. Eg. `<div sf-role="list" sf-sobject="Account"></div>`
2. **Detail **: Detail Element provides a quick and easy way to render the details for any sobject. One can easily manage the behavior of the element by using the various attributes or the javascript hooks on this element. Supported attributes include: sf-sobject, sf-recordid, sf-hasrecordtypes, sf-recordtypeid, sf-template. Eg. `<div sf-role="detail" sf-sobject="Account" sf-recordid="001000000000AAA"></div>`
3. **Form **: Form Element provides a quick and easy way to render a form for modifying/creating  any sobject record. One can easily manage the behavior of the element by using the various attributes or the javascript hooks on this element. Supported attributes include: sf-role, sf-sobject, sf-recordid, sf-hasrecordtypes, sf-recordtypeid, sf-template. Eg. `<div sf-role="edit" sf-sobject="Account" sf-recordid="001000000000AAA"></div>`


## Sample Apps ##
- iOS-Hybrid: A Hybrid sample app to demonstrate the use of Mobile UI elements inside Mobile SDK.
- local: A simple HTML file that can be run locally on the browser to easily test and learn the UI Elements.
 
## Third-party Code ##

This library makes use of a number of third-party components:

- [jQuery](http://jquery.com), the JavaScript library to make it easy to write javascript.
- [Backbonejs](http://backbonejs.org), a JavaScript library providing the model–view–presenter (MVP) application design paradigm.
- [Google Polymer](http://www.polymer-project.org/), a JavaScript library to add new extensions and features to modern HTML5 browsers.
- [Ratchet](http://maker.github.io/ratchet), Prototype iPhone apps with simple HTML, CSS, and JS components.
- [jQuery Mobile](http://jquerymobile.com), Touch-Optimized Web Framework for Smartphones & Tablets.


## Mobile UI Elements License ##
Copyright (c) 2013, salesforce.com, inc. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

- Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
- Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
- Neither the name of salesforce.com, inc. nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

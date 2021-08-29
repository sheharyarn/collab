// We need to import the CSS so that webpack will load it.
// The MiniCssExtractPlugin is used to separate it out into
// its own CSS file.
import "../css/app.css"

import "phoenix_html"
import {Socket} from "phoenix"
import socket from "./socket"
import Document from './document'



// Helpers
const openDoc = (id) => window.location = `/${id}`;
const randomId = () => Math.random().toString(36).substring(2, 7);

const addListener = (selector, event, fun) => {
  const elem = document.querySelector(selector);
  if (elem) elem.addEventListener(event, fun);
};



// New Document
addListener('#new-doc', 'click', () => {
  openDoc(randomId());
});


// Open existing document
addListener('#open-doc', 'submit', (e) => {
  e.preventDefault();

  const form = new FormData(e.target);
  const id = form.get('id');
  openDoc(id);
});


// Initialize editor
window.doc = new Document('#editor', socket);

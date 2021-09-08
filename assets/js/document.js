import Delta from 'quill-delta';

export default class Document {
  editor = null;     // DOM element reference
  channel = null;    // Connected socket channel

  contents = null;   // Local contents

  constructor(selector, socket) {
    this.editor = document.querySelector(selector);

    if (this.editor) {
      const id = this.editor.dataset.id;
      this.channel = socket.channel(`doc:${id}`, {});

      // Join document channel and set up event listeners
      this.channel
        .join()
        .receive('ok', () => {
          this.channel.on('open', (resp) => this.onOpen(resp));
          this.channel.on('update', (resp) => this.onRemoteUpdate(resp));
          this.editor.addEventListener('input', (e) => this.onLocalUpdate(e.target));
        })
        .receive('error', (resp) => {
          console.log('Socket Error', resp)
        });
    }
  }


  // Show initial contents on joining the document channel
  onOpen({ contents }) {
    this.contents = new Delta(contents);
    this.updateEditor();
  }


  // Track and push local changes
  onLocalUpdate({ value }) {
    const newDelta = new Delta().insert(value);
    const change = this.contents.diff(newDelta).ops;

    this.contents = newDelta;

    // setTimeout(() => {
      this.channel.push('update', { change })
    // }, 2000);
  }


  // Listen for remote changes
  onRemoteUpdate({ change }) {
    let remoteChange = new Delta(change);

    this.contents = this.contents.compose(remoteChange);
    this.updateEditor();
  }



  // Flatten delta to plain text and display value in editor
  updateEditor() {
    this.editor.value =
      this.contents.reduce((text, op) => {
        const val = (typeof op.insert === 'string') ? op.insert : '';
        return text + val;
      }, '');
  }
};

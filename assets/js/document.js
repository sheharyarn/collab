import Delta from 'quill-delta';

class Document {
  id = null;
  editor = null;
  channel = null;
  contents = null;

  constructor(selector, socket) {
    this.editor = document.querySelector(selector);

    if (this.editor) {
      this.id = this.editor.dataset.id;
      this.channel = socket.channel(`doc:${this.id}`, {});

      this.channel
        .join()
        .receive('ok', (resp) => this.setupListeners())
        .receive('error', resp => console.log('Socket Error', resp));
    }
  }

  setupListeners() {
    // Show initial contents on opening doc
    this.channel.on('open', (resp) => {
      this.contents = new Delta(resp.contents);
      this.updateEditor();
    });

    // Listen for remote changes
    this.channel.on('update', (resp) => {
      const change = new Delta(resp.change);
      const newPosition = change.transformPosition(this.editor.selectionStart);
      this.contents = this.contents.compose(change);
      this.updateEditor(newPosition);
    });

    // Track and push local changes
    this.editor.addEventListener('input', (e) => {
      const newDelta = new Delta().insert(e.target.value);
      const change = this.contents.diff(newDelta).ops;

      this.channel.push('update', { change });
      this.contents = newDelta;
    });
  }

  // Convert delta to text and display value in editor
  updateEditor(position) {
    const text = this.contents.reduce((text, op) => {
      const val = (typeof op.insert === 'string') ? op.insert : '';
      return text + val;
    }, '');

    this.editor.value = text;

    if (position) {
      this.editor.selectionStart = position;
      this.editor.selectionEnd = position;
    }
  }
};

export default Document;

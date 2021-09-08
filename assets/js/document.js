import Delta from 'quill-delta';

export default class Document {
  editor = null;     // DOM element reference
  channel = null;    // Connected socket channel

  version = 0;       // Local version
  contents = null;   // Local contents
  committing = null; // Local change being currently pushed
  queued = null;     // Pending change yet to be pushed

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
  onOpen({ contents, version }) {
    this.version = version;
    this.contents = new Delta(contents);
    this.updateEditor();
  }


  // Track and push local changes
  onLocalUpdate({ value }) {
    const newDelta = new Delta().insert(value);
    const change = this.contents.diff(newDelta);

    this.contents = newDelta;
    this.pushLocalChange(change);
  }

  pushLocalChange(change) {
    if (this.committing) {
      this.queued = this.queued || new Delta();
      this.queued = this.queued.compose(change);
    } else {
      const version = this.version;
      this.version += 1;
      this.committing = change;

      // setTimeout(() => {
        this.channel
          .push('update', { change: change.ops, version })
          .receive('ok', (resp) => {
            this.committing = null;

            if (this.queued) {
              this.pushLocalChange(this.queued);
              this.queued = null;
            }
          });
      // }, 2000);
    }
  }


  // Listen for remote changes
  onRemoteUpdate({ change, version }) {
    let remoteDelta = new Delta(change);

    if (this.committing) {
      remoteDelta = this.committing.transform(remoteDelta, false);

      if (this.queued) {
        const remotePending = this.queued.transform(remoteDelta, false);
        this.queued = remoteDelta.transform(this.queued, true);
        remoteDelta = remotePending;
      }
    }

    this.contents = this.contents.compose(remoteDelta);
    this.version += 1;
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

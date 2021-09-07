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
    this.logState('CURRENT STATE');

    this.version = version;
    this.contents = new Delta(contents);
    this.updateEditor();

    this.logState('UPDATED STATE');
  }


  // Track and push local changes
  onLocalUpdate({ value }) {
    this.logState('CURRENT STATE');

    const newDelta = new Delta().insert(value);
    const change = this.contents.diff(newDelta);

    this.contents = newDelta;
    this.pushLocalChange(change);
    this.logState('UPDATED STATE');
  }

  pushLocalChange(change) {
    if (this.committing) {
      // Queue new changes if we're already in the middle of
      // pushing previous changes to server
      this.queued = this.queued || new Delta();
      this.queued = this.queued.compose(change);
    } else {
      const version = this.version;
      this.version += 1;
      this.committing = change;

      setTimeout(() => {
        this.channel
          .push('update', { change: change.ops, version })
          .receive('ok', (resp) => {
            console.log('ACK RECEIVED FOR', version, change.ops)
            this.committing = null;

            // Push any queued changes after receiving ACK
            // from server
            if (this.queued) {
              this.pushLocalChange(this.queued);
              this.queued = null;
            }
          });
      }, 2000);
    }
  }


  // Listen for remote changes
  onRemoteUpdate({ change, version }) {
    this.logState('CURRENT STATE');
    console.log('RECEIVED', { version, change })

    let remoteDelta = new Delta(change);

    // Transform remote delta if we're in the middle
    // of pushing changes
    if (this.committing) {
      remoteDelta = this.committing.transform(remoteDelta, false);

      // If there are more queued changes the server hasn't seen
      // yet, transform both remote delta and queued changes on
      // each other to make the document consistent with server.
      if (this.queued) {
        const remotePending = this.queued.transform(remoteDelta, false);
        this.queued = remoteDelta.transform(this.queued, true);
        remoteDelta = remotePending;
      }
    }

    const newPosition = remoteDelta.transformPosition(this.editor.selectionStart);
    this.contents = this.contents.compose(remoteDelta);
    this.version += 1;
    this.updateEditor(newPosition);

    this.logState('UPDATED STATE');
  }



  // Flatten delta to plain text and display value in editor
  updateEditor(position) {
    this.editor.value =
      this.contents.reduce((text, op) => {
        const val = (typeof op.insert === 'string') ? op.insert : '';
        return text + val;
      }, '');

    if (position) {
      this.editor.selectionStart = position;
      this.editor.selectionEnd = position;
    }
  }

  logState(msg) {
    console.log(msg, {
      version: this.version,
      contents: this.contents && this.contents.ops[0] && this.contents.ops[0].insert,
    });
  }
};

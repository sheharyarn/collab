import Delta from 'quill-delta';

const simple = (delta) => delta && delta.ops;

export default class Document {
  // DOM Element Reference
  editor = null;
  // Connected Socket Channel for Document
  channel = null;

  version = 0;
  changes = []
  contents = null;
  queued = null;
  isCommitting = false;

  constructor(selector, socket) {
    this.editor = document.querySelector(selector);

    if (this.editor) {
      const id = this.editor.dataset.id;
      this.channel = socket.channel(`doc:${id}`, {});

      this.channel
        .join()
        // .receive('ok', () => this.ss())
        .receive('ok', () => {
          // Set up Listners
          this.channel.on('open', (resp) => this.onOpen(resp));
          this.channel.on('update', (resp) => this.onRemoteUpdate(resp));
          this.editor.addEventListener('input', (e) => this.onLocalUpdate(e.target));
        })
        .receive('error', (resp) => console.log('Socket Error', resp));
    }
  }

  // ss() {
  //   this.channel.on('open', (resp) => this.onOpen(resp));
  //   this.channel.on('update', this.onRemoteUpdate);
  //   this.editor.addEventListener('input', (e) => this.onLocalUpdate(e.target.value));
  // }

  // Show initial contents on opening doc
  onOpen({ contents, version }) {
    this.logState('CURRENT STATE');

    this.version = version;
    this.contents = new Delta(contents);
    this.updateEditor();

    this.logState('UPDATED STATE');
  }



  onRemoteUpdate({ change, version }) {
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
    if (this.isCommitting) {
      this.queued = this.queued || new Delta();
      this.queued = this.queued.compose(change);
    } else {
      const version = this.version;
      this.version += 1;
      this.changes.push(change);
      this.isCommitting = true;

      setTimeout(() => {
        this.channel
          .push('update', { change: change.ops, version })
          .receive('ok', (resp) => {
            console.log('ACK RECEIVED FOR', version, change.ops)
            this.isCommitting = false;
            if (this.queued) {
              this.pushLocalChange(this.queued);
              this.queued = null;
            }
          });
      }, 3000);
    }
  }






  setupListeners() {
    // Show initial contents on opening doc
    this.channel.on('open', (resp) => {
      this.logState('CURRENT STATE');
      this.version = resp.version;
      this.contents = new Delta(resp.contents);
      this.updateEditor();
      this.logState('UPDATED STATE');
    });

    // Listen for remote changes
    this.channel.on('update', (resp) => {
      this.logState('CURRENT STATE');
      console.log('RECEIVED UPDATE', resp);

      if (resp.version <= this.version + 1) {
        const changesSince = this.version - resp.version;
        const change = new Delta(resp.change);

        const transformed =
          this.changes
            .slice(this.changes.length - changesSince)
            .reduce((acc, ch) => acc.transform(ch), change);


        console.log('TRANSFORMED', simple(transformed));

        const newPosition = change.transformPosition(this.editor.selectionStart);

        this.contents = this.contents.compose(transformed);
        this.version = resp.version;
        this.changes.push(transformed);
        this.updateEditor(newPosition);
      }

      this.logState('UPDATED STATE');
    });

    // Track and push local changes
    this.editor.addEventListener('input', (e) => {
      this.logState('CURRENT STATE');

      const newDelta = new Delta().insert(e.target.value);
      const change = this.contents.diff(newDelta);
      const version = this.version;

      this.changes.push(change);

      setTimeout(() => {
        this.channel
          .push('update', { change: change.ops, version })
          .receive('ok', (resp) => {
            console.log('ACK RECEIVED', change.ops, resp);

            if (version === this.version) {
              this.version += 1;
              this.contents = newDelta;
            } else {
              console.log('VERSION MISMATCH')

              const changeCount = this.version - version;
              const transformed =
                this.changes
                  .slice(this.changes.length - changeCount)
                  .reduce((ch, base) => base.transform(ch), change)

              console.log('TRANSFORMED', simple(transformed))
              this.version += 1;
              this.contents = this.contents.compose(transformed);
            }
          })
          .receive('error', (resp) => console.log('ACK ERROR', resp));
      }, 3000)

      this.logState('UPDATED STATE');
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

  logState(msg) {
    console.log(msg, {
      version: this.version,
      contents: this.contents && this.contents.ops[0] && this.contents.ops[0].insert,
    });
  }
};

export default class Document {
  editor = null;     // Textarea reference
  channel = null;    // Connected socket channel

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
    this.editor.value = contents;
  }


  // Track and push local changes
  onLocalUpdate({ value }) {
    // setTimeout(() => {
      this.channel.push('update', { contents: value })
    // }, 2000);
  }


  // Listen for remote changes
  onRemoteUpdate({ contents }) {
    this.editor.value = contents;
  }
};

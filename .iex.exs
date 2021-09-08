alias Delta.Op
alias Collab.{
  Document,
  Document.Supervisor,
}


# Create some initial docs
Document.update("hello", "Hello World!")
Document.update("goat", "go")

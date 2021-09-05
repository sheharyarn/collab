alias Delta.Op
alias Collab.{
  Document,
  Document.Supervisor,
}


# Create some initial docs
Document.update("hello", [Op.insert("Hello World!")], 0)
Document.update("goat", [Op.insert("go")], 0)

alias Delta.Op
alias Collab.{
  Document,
  Document.Supervisor,
}


# Create some initial docs
Document.update("hello", [Op.insert("Hello World!")])
Document.update("goat", [Op.insert("go")])

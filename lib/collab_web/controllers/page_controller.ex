defmodule CollabWeb.PageController do
  use CollabWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end

  def view(conn, %{"id" => id}) do
    render(conn, "view.html", id: id)
  end
end

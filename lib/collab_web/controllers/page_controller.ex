defmodule CollabWeb.PageController do
  use CollabWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end
end

defmodule Collab.Document do
  use GenServer
  alias __MODULE__.Supervisor

  @initial_state %{
    version: 0,
    changes: [],
    contents: [],
  }


  # Public API
  # ----------

  def start_link(id), do: GenServer.start_link(__MODULE__, :ok, name: name(id))
  def stop(id),       do: GenServer.stop(name(id))

  def get_contents(id),        do: call(id, :get_contents)
  def update(id, change, ver), do: call(id, {:update, change, ver})

  def open(id) do
    case GenServer.whereis(name(id)) do
      nil -> DynamicSupervisor.start_child(Supervisor, {__MODULE__, id})
      pid -> {:ok, pid}
    end
  end


  # Callbacks
  # ---------

  @impl true
  def init(:ok), do: {:ok, @initial_state}

  @impl true
  def handle_call(:get_contents, _from, state) do
    response = Map.take(state, [:version, :contents])
    {:reply, response, state}
  end

  @impl true
  def handle_call({:update, client_change, client_version}, _from, state) do
    if client_version > state.version do
      # Error when client version is inconsistent with
      # server state
      {:reply, {:error, :server_behind}, state}
    else
      # Check how far behind client is
      changes_count = state.version - client_version

      # Transform client change if it was sent on an
      # older version of the document
      transformed_change =
        state.changes
        |> Enum.take(changes_count)
        |> Enum.reverse()
        |> Enum.reduce(client_change, &Delta.transform(&1, &2, true))

      state = %{
        version: state.version + 1,
        changes: [transformed_change | state.changes],
        contents: Delta.compose(state.contents, transformed_change),
      }

      response = %{
        version: state.version,
        change: transformed_change,
      }

      {:reply, {:ok, response}, state}
    end
  end


  # Private Helpers
  # ---------------

  defp call(id, data) do
    with {:ok, pid} <- open(id), do: GenServer.call(pid, data)
  end

  defp name(id), do: {:global, {:doc, id}}
end

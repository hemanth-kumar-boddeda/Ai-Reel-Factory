import sys
sys.path.insert(0, '/c/Users/RATNAM/Downloads/ai-reel-factory-working-mvp/ai-reel-factory-working')

from unittest.mock import MagicMock, patch
from app.services.reel import ReelService
from app.models.reel import ReelItem, ReelStatus
from app.schemas.reel import ReelItemUpdate
from app.services.ai_providers.script_provider import StructuredScript, Scene

def test_process_reel_by_id_success():
    # Setup mock session and repository
    mock_db = MagicMock()
    mock_repository = MagicMock()
    mock_job_repository = MagicMock()

    # Create a reel instance
    reel = ReelItem(
        id=1,
        user_id=1,
        title="Test Reel",
        summary="Test summary",
        status=ReelStatus.DISCOVERED.value
    )

    # Configure the repository to return the reel
    mock_repository.get_by_id_and_user.return_value = reel
    mock_repository.update.return_value = None  # update returns nothing

    # Create a mock AI orchestrator that returns a valid structured script
    mock_script = StructuredScript(
        hook="Test hook",
        title="Test title",
        narration="Test narration",
        scenes=[Scene(
            scene_number=1,
            duration_seconds=5,
            narration="Scene narration",
            visual_prompt="Test visual",
            on_screen_text="Test text",
            transition="fade"
        )],
        cta="Test cta",
        estimated_duration_seconds=10
    )

    # Create the service with mocked dependencies
    service = ReelService(mock_db)
    service.repository = mock_repository
    service.job_repository = mock_job_repository
    service.ai_orchestrator = MagicMock()
    service.ai_orchestrator.generate_script = MagicMock(return_value=mock_script)

    # Mock the make_video method to avoid FFmpeg calls
    service.make_video = MagicMock()

    # Call the method
    result = service.process_reel_by_id(reel_id=1, user_id=1)

    # Assertions
    assert result == reel.id  # should return the reel id

    # Check that the repository update was called with the expected arguments
    # We expect at least two calls: one for researching and one for scripting
    assert mock_repository.update.call_count >= 2

    # Get the arguments of the update calls
    calls = mock_repository.update.call_args_list

    # The first call should be for researching
    first_call_args = calls[0][1]  # keyword arguments
    assert first_call_args.get('status') == ReelStatus.RESEARCHING.value

    # The second call should be for scripting with the structured script data
    second_call_args = calls[1][1]
    assert second_call_args.get('status') == ReelStatus.SCRIPTING.value
    assert second_call_args.get('research_data') is not None  # JSON string
    assert second_call_args.get('script') == mock_script.narration
    assert second_call_args.get('hook') == mock_script.hook
    assert second_call_args.get('duration') == mock_script.estimated_duration_seconds
    assert second_call_args.get('cta') == mock_script.cta

    print("process_reel_by_id success test passed")

def test_process_reel_by_id_failure_provider_none():
    # Setup mock session and repository
    mock_db = MagicMock()
    mock_repository = MagicMock()
    mock_job_repository = MagicMock()

    # Create a reel instance
    reel = ReelItem(
        id=1,
        user_id=1,
        title="Test Reel",
        summary="Test summary",
        status=ReelStatus.DISCOVERED.value
    )

    # Configure the repository to return the reel
    mock_repository.get_by_id_and_user.return_value = reel
    mock_repository.update.return_value = None

    # Create a mock AI orchestrator that returns None (failure)
    service = ReelService(mock_db)
    service.repository = mock_repository
    service.job_repository = mock_job_repository
    service.ai_orchestrator = MagicMock()
    service.ai_orchestrator.generate_script = MagicMock(return_value=None)

    # Mock the make_video method
    service.make_video = MagicMock()

    # Call the method
    result = service.process_reel_by_id(reel_id=1, user_id=1)

    # Assertions
    assert result is None  # should return None on failure

    # Check that the repository update was called with FAILED status
    # We expect at least two calls: one for researching and one for failed
    assert mock_repository.update.call_count >= 2

    # Get the arguments of the update calls
    calls = mock_repository.update.call_args_list

    # The last call should be for failed status
    last_call_args = calls[-1][1]
    assert last_call_args.get('status') == ReelStatus.FAILED.value

    print("process_reel_by_id failure (provider None) test passed")

def test_process_reel_by_id_failure_exception():
    # Setup mock session and repository
    mock_db = MagicMock()
    mock_repository = MagicMock()
    mock_job_repository = MagicMock()

    # Create a reel instance
    reel = ReelItem(
        id=1,
        user_id=1,
        title="Test Reel",
        summary="Test summary",
        status=ReelStatus.DISCOVERED.value
    )

    # Configure the repository to return the reel
    mock_repository.get_by_id_and_user.return_value = reel
    mock_repository.update.return_value = None

    # Create a mock AI orchestrator that raises an exception
    service = ReelService(mock_db)
    service.repository = mock_repository
    service.job_repository = mock_job_repository
    service.ai_orchestrator = MagicMock()
    service.ai_orchestrator.generate_script = MagicMock(side_effect=Exception("AI error"))

    # Mock the make_video method
    service.make_video = MagicMock()

    # Call the method
    result = service.process_reel_by_id(reel_id=1, user_id=1)

    # Assertions
    assert result is None  # should return None on failure

    # Check that the repository update was called with FAILED status
    assert mock_repository.update.call_count >= 2

    # Get the arguments of the update calls
    calls = mock_repository.update.call_args_list

    # The last call should be for failed status
    last_call_args = calls[-1][1]
    assert last_call_args.get('status') == ReelStatus.FAILED.value

    print("process_reel_by_id failure (exception) test passed")

def test_structured_script_serialization():
    # Create an instance
    scene = Scene(
        scene_number=1,
        duration_seconds=5,
        narration="Test narration",
        visual_prompt="Test visual",
        on_screen_text="Test text",
        transition="fade"
    )

    script = StructuredScript(
        hook="Test hook",
        title="Test title",
        narration="Test narration",
        scenes=[scene],
        cta="Test cta",
        estimated_duration_seconds=10
    )

    # Try to serialize to JSON using model_dump_json (Pydantic v2)
    try:
        json_str = script.model_dump_json()
        assert isinstance(json_str, str)
        assert len(json_str) > 0
    except AttributeError:
        # Fallback to json() for Pydantic v1
        json_str = script.json()
        assert isinstance(json_str, str)
        assert len(json_str) > 0

    # Deserialize
    parsed = StructuredScript.parse_raw(json_str)
    assert parsed.hook == "Test hook"
    assert parsed.narration == "Test narration"
    assert parsed.estimated_duration_seconds == 10
    assert parsed.cta == "Test cta"

    print("StructuredScript serialization test passed")

def test_process_pipeline_success():
    # Setup mock session and repository
    mock_db = MagicMock()
    mock_repository = MagicMock()
    mock_job_repository = MagicMock()

    # Mock the get_rss_items to return nothing (so we don't create new reels) but we need to have a reel in discovered state
    # We'll mock the repository.create to do nothing
    mock_repository.create.return_value = None

    # Create a reel instance that will be the highest scoring discovered
    reel = ReelItem(
        id=1,
        user_id=1,
        title="Test Reel",
        summary="Test summary",
        status=ReelStatus.DISCOVERED.value,
        score=100
    )

    # Mock the db.query to return our reel when filtering by DISCOVERED and ordering by score.desc, id.desc
    mock_query = MagicMock()
    mock_filter = MagicMock()
    mock_order_by = MagicMock()
    mock_query.filter.return_value = mock_filter
    mock_filter.order_by.return_value = mock_order_by
    mock_order_by.first.return_value = reel
    mock_db.query.return_value = mock_query

    # Mock the ai_orchestrator
    mock_script = StructuredScript(
        hook="Test hook",
        title="Test title",
        narration="Test narration",
        scenes=[Scene(
            scene_number=1,
            duration_seconds=5,
            narration="Scene narration",
            visual_prompt="Test visual",
            on_screen_text="Test text",
            transition="fade"
        )],
        cta="Test cta",
        estimated_duration_seconds=10
    )
    service = ReelService(mock_db)
    service.repository = mock_repository
    service.job_repository = mock_job_repository
    service.ai_orchestrator = MagicMock()
    service.ai_orchestrator.generate_script = MagicMock(return_value=mock_script)

    # Mock the make_video method
    service.make_video = MagicMock()

    # Mock background_tasks (not used in the method, but we need to pass it)
    background_tasks = MagicMock()

    # Call the method
    result = service.process_pipeline(background_tasks=background_tasks, user_id=1)

    # Assertions
    assert result == reel.id  # should return the reel id

    # Check that the repository update was called with the expected arguments
    # We expect at least two calls: one for researching and one for scripting
    assert mock_repository.update.call_count >= 2

    # Get the arguments of the update calls
    calls = mock_repository.update.call_args_list

    # The first call should be for researching
    first_call_args = calls[0][1]  # keyword arguments
    assert first_call_args.get('status') == ReelStatus.RESEARCHING.value

    # The second call should be for scripting with the structured script data
    second_call_args = calls[1][1]
    assert second_call_args.get('status') == ReelStatus.SCRIPTING.value
    assert second_call_args.get('research_data') is not None  # JSON string
    assert second_call_args.get('script') == mock_script.narration
    assert second_call_args.get('hook') == mock_script.hook
    assert second_call_args.get('duration') == mock_script.estimated_duration_seconds
    assert second_call_args.get('cta') == mock_script.cta

    print("process_pipeline success test passed")

def test_storyboard_generation_valid():
    # Setup mock session and repository
    mock_db = MagicMock()
    mock_repository = MagicMock()
    mock_job_repository = MagicMock()

    # Create a reel instance
    reel = ReelItem(
        id=1,
        user_id=1,
        title="Test Reel",
        summary="Test summary",
        status=ReelStatus.DISCOVERED.value
    )

    # Configure the repository to return the reel
    mock_repository.get_by_id_and_user.return_value = reel
    mock_repository.update.return_value = None

    # Create a mock AI orchestrator that returns a valid structured script with multiple scenes
    mock_script = StructuredScript(
        hook="Test hook",
        title="Test title",
        narration="Test narration",
        scenes=[
            Scene(
                scene_number=1,
                duration_seconds=5,
                narration="Scene 1 narration",
                visual_prompt="Visual 1",
                on_screen_text="Text 1",
                transition="fade"
            ),
            Scene(
                scene_number=2,
                duration_seconds=10,
                narration="Scene 2 narration",
                visual_prompt="Visual 2",
                on_screen_text="Text 2",
                transition="slide"
            )
        ],
        cta="Test cta",
        estimated_duration_seconds=15
    )

    # Create the service with mocked dependencies
    service = ReelService(mock_db)
    service.repository = mock_repository
    service.job_repository = mock_job_repository
    service.ai_orchestrator = MagicMock()
    service.ai_orchestrator.generate_script = MagicMock(return_value=mock_script)

    # Mock the make_video method to avoid FFmpeg calls
    service.make_video = MagicMock()

    # Call the method (process_reel_by_id)
    result = service.process_reel_by_id(reel_id=1, user_id=1)

    # Assertions
    assert result == reel.id

    # Check that the repository update was called for storyboard
    # We expect at least three calls: researching, scripting, storyboard
    assert mock_repository.update.call_count >= 3

    # Get the arguments of the update calls
    calls = mock_repository.update.call_args_list

    # The third call should be for storyboard (ASSET_GENERATION) with storyboard JSON
    # Find the call where status is ASSET_GENERATION.value
    storyboard_call = None
    for call in calls:
        kwargs = call[1]
        if kwargs.get('status') == ReelStatus.ASSET_GENERATION.value:
            storyboard_call = kwargs
            break

    assert storyboard_call is not None, "Storyboard update not found"
    storyboard_json = storyboard_call.get('storyboard')
    assert storyboard_json is not None, "Storyboard JSON is None"

    # Parse the JSON
    import json
    storyboard_data = json.loads(storyboard_json)

    # Check structure
    assert "scenes" in storyboard_data
    assert "total_duration_seconds" in storyboard_data
    assert len(storyboard_data["scenes"]) == 2
    assert storyboard_data["total_duration_seconds"] == 15

    # Check first scene
    scene1 = storyboard_data["scenes"][0]
    assert scene1["scene_number"] == 1
    assert scene1["duration_seconds"] == 5
    assert scene1["narration"] == "Scene 1 narration"
    assert scene1["visual_prompt"] == "Visual 1"
    assert scene1["on_screen_text"] == "Text 1"
    assert scene1["transition"] == "fade"

    # Check second scene
    scene2 = storyboard_data["scenes"][1]
    assert scene2["scene_number"] == 2
    assert scene2["duration_seconds"] == 10
    assert scene2["narration"] == "Scene 2 narration"
    assert scene2["visual_prompt"] == "Visual 2"
    assert scene2["on_screen_text"] == "Text 2"
    assert scene2["transition"] == "slide"

    print("test_storyboard_generation_valid passed")


def test_storyboard_empty_scenes_fails():
    mock_db = MagicMock()
    mock_repository = MagicMock()
    mock_job_repository = MagicMock()

    reel = ReelItem(
        id=1,
        user_id=1,
        title="Test Reel",
        summary="Test summary",
        status=ReelStatus.DISCOVERED.value
    )

    mock_repository.get_by_id_and_user.return_value = reel
    mock_repository.update.return_value = None

    # Create a mock AI orchestrator that returns a structured script with empty scenes
    mock_script = StructuredScript(
        hook="Test hook",
        title="Test title",
        narration="Test narration",
        scenes=[],  # Empty scenes
        cta="Test cta",
        estimated_duration_seconds=0
    )

    service = ReelService(mock_db)
    service.repository = mock_repository
    service.job_repository = mock_job_repository
    service.ai_orchestrator = MagicMock()
    service.ai_orchestrator.generate_script = MagicMock(return_value=mock_script)
    service.make_video = MagicMock()

    result = service.process_reel_by_id(reel_id=1, user_id=1)

    # Should fail and return None
    assert result is None

    # Check that the repository update was called with FAILED status
    calls = mock_repository.update.call_args_list
    # The last call should be for FAILED status
    last_call_args = calls[-1][1]
    assert last_call_args.get('status') == ReelStatus.FAILED.value

    print("test_storyboard_empty_scenes_fails passed")


def test_storyboard_invalid_duration_fails():
    mock_db = MagicMock()
    mock_repository = MagicMock()
    mock_job_repository = MagicMock()

    reel = ReelItem(
        id=1,
        user_id=1,
        title="Test Reel",
        summary="Test summary",
        status=ReelStatus.DISCOVERED.value
    )

    mock_repository.get_by_id_and_user.return_value = reel
    mock_repository.update.return_value = None

    # Create a mock AI orchestrator that returns a structured script with negative duration
    mock_script = StructuredScript(
        hook="Test hook",
        title="Test title",
        narration="Test narration",
        scenes=[
            Scene(
                scene_number=1,
                duration_seconds=-5,  # Invalid negative duration
                narration="Scene narration",
                visual_prompt="Test visual",
                on_screen_text="Test text",
                transition="fade"
            )
        ],
        cta="Test cta",
        estimated_duration_seconds=0  # This will be overridden by sum? but we still have negative
    )

    service = ReelService(mock_db)
    service.repository = mock_repository
    service.job_repository = mock_job_repository
    service.ai_orchestrator = MagicMock()
    service.ai_orchestrator.generate_script = MagicMock(return_value=mock_script)
    service.make_video = MagicMock()

    result = service.process_reel_by_id(reel_id=1, user_id=1)

    # Should fail and return None
    assert result is None

    # Check that the repository update was called with FAILED status
    calls = mock_repository.update.call_args_list
    last_call_args = calls[-1][1]
    assert last_call_args.get('status') == ReelStatus.FAILED.value

    print("test_storyboard_invalid_duration_fails passed")


def test_process_reel_by_id_persists_storyboard():
    mock_db = MagicMock()
    mock_repository = MagicMock()
    mock_job_repository = MagicMock()

    reel = ReelItem(
        id=1,
        user_id=1,
        title="Test Reel",
        summary="Test summary",
        status=ReelStatus.DISCOVERED.value
    )

    mock_repository.get_by_id_and_user.return_value = reel
    mock_repository.update.return_value = None

    mock_script = StructuredScript(
        hook="H",
        title="T",
        narration="N",
        scenes=[
            Scene(scene_number=1, duration_seconds=5, narration="n1", visual_prompt="v1", on_screen_text="t1", transition="t1")
        ],
        cta="C",
        estimated_duration_seconds=5
    )

    service = ReelService(mock_db)
    service.repository = mock_repository
    service.job_repository = mock_job_repository
    service.ai_orchestrator = MagicMock()
    service.ai_orchestrator.generate_script = MagicMock(return_value=mock_script)
    service.make_video = MagicMock()

    result = service.process_reel_by_id(reel_id=1, user_id=1)
    assert result == reel.id

    calls = mock_repository.update.call_args_list
    # Find the storyboard update (ASSET_GENERATION)
    storyboard_call = None
    for call in calls:
        kwargs = call[1]
        if kwargs.get('status') == ReelStatus.ASSET_GENERATION.value:
            storyboard_call = kwargs
            break

    assert storyboard_call is not None
    storyboard_json = storyboard_call.get('storyboard')
    assert storyboard_json is not None

    import json
    storyboard_data = json.loads(storyboard_json)
    assert len(storyboard_data["scenes"]) == 1
    scene = storyboard_data["scenes"][0]
    assert scene["narration"] == "n1"
    assert scene["visual_prompt"] == "v1"
    assert scene["on_screen_text"] == "t1"
    assert scene["transition"] == "t1"
    assert storyboard_data["total_duration_seconds"] == 5

    print("test_process_reel_by_id_persists_storyboard passed")


def test_process_pipeline_persists_storyboard():
    mock_db = MagicMock()
    mock_repository = MagicMock()
    mock_job_repository = MagicMock()

    # Mock the get_rss_items to return nothing (so we don't create new reels) but we need to have a reel in discovered state
    mock_repository.create.return_value = None

    # Create a reel instance that will be the highest scoring discovered
    reel = ReelItem(
        id=1,
        user_id=1,
        title="Test Reel",
        summary="Test summary",
        status=ReelStatus.DISCOVERED.value,
        score=100
    )

    # Mock the db.query to return our reel when filtering by DISCOVERED and ordering by score.desc, id.desc
    mock_query = MagicMock()
    mock_filter = MagicMock()
    mock_order_by = MagicMock()
    mock_query.filter.return_value = mock_filter
    mock_filter.order_by.return_value = mock_order_by
    mock_order_by.first.return_value = reel
    mock_db.query.return_value = mock_query

    mock_script = StructuredScript(
        hook="H",
        title="T",
        narration="N",
        scenes=[
            Scene(scene_number=1, duration_seconds=7, narration="n1", visual_prompt="v1", on_screen_text="t1", transition="t1"),
            Scene(scene_number=2, duration_seconds=3, narration="n2", visual_prompt="v2", on_screen_text="t2", transition="t2")
        ],
        cta="C",
        estimated_duration_seconds=10
    )

    service = ReelService(mock_db)
    service.repository = mock_repository
    service.job_repository = mock_job_repository
    service.ai_orchestrator = MagicMock()
    service.ai_orchestrator.generate_script = MagicMock(return_value=mock_script)
    service.make_video = MagicMock()

    # Mock background_tasks (not used in the method, but we need to pass it)
    background_tasks = MagicMock()

    result = service.process_pipeline(background_tasks=background_tasks, user_id=1)
    assert result == reel.id

    calls = mock_repository.update.call_args_list
    # Find the storyboard update (ASSET_GENERATION)
    storyboard_call = None
    for call in calls:
        kwargs = call[1]
        if kwargs.get('status') == ReelStatus.ASSET_GENERATION.value:
            storyboard_call = kwargs
            break

    assert storyboard_call is not None
    storyboard_json = storyboard_call.get('storyboard')
    assert storyboard_json is not None

    import json
    storyboard_data = json.loads(storyboard_json)
    assert len(storyboard_data["scenes"]) == 2
    assert storyboard_data["scenes"][0]["narration"] == "n1"
    assert storyboard_data["scenes"][1]["narration"] == "n2"
    assert storyboard_data["total_duration_seconds"] == 10

    print("test_process_pipeline_persists_storyboard passed")


if __name__ == "__main__":
    test_process_reel_by_id_success()
    test_process_reel_by_id_failure_provider_none()
    test_process_reel_by_id_failure_exception()
    test_structured_script_serialization()
    test_process_pipeline_success()
    test_storyboard_generation_valid()
    test_storyboard_empty_scenes_fails()
    test_storyboard_invalid_duration_fails()
    test_process_reel_by_id_persists_storyboard()
    test_process_pipeline_persists_storyboard()
    print("All tests passed")
"""
Instagram Publishing Provider
Handles communication with the Instagram Graph API for publishing Reels.
"""
import json
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import urllib.request
import urllib.parse
import urllib.error

from app.core.security import encrypt_token, decrypt_token
from app.core.config import settings
from app.models.instagram import InstagramConnection
from app.services.reel import ReelService
from sqlalchemy.orm import Session
class InstagramAPIError(Exception):
    """Exception raised for Instagram API errors."""
    def __init__(self, message: str, status_code: Optional[int] = None, payload: Optional[Dict] = None):
        self.message = message
        self.status_code = status_code
        self.payload = payload
        super().__init__(self.message)
class InstagramProvider:
    BASE_URL = "https://graph.facebook.com/v12.0"

    def __init__(self, db: Session):
        self.db = db

    def _get_access_token(self, connection: InstagramConnection) -> str:
        """Decrypt and return the access token."""
        return decrypt_token(connection.access_token_encrypted)

    def _make_request(self, method: str, endpoint: str, token: str, params: Optional[Dict] = None, data: Optional[Dict] = None) -> Dict[str, Any]:
        """Make an HTTP request to the Instagram Graph API."""
        url = f"{self.BASE_URL}{endpoint}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        if params:
            url += "?" + urllib.parse.urlencode(params)

        data_bytes = None
        if data:
            data_bytes = json.dumps(data).encode('utf-8')

        req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req) as response:
                response_data = response.read().decode('utf-8')
                return json.loads(response_data)
        except urllib.error.HTTPError as e:
            error_data = e.read().decode('utf-8')
            try:
                error_json = json.loads(error_data)
                error_message = error_json.get('error', {}).get('message', str(e))
            except json.JSONDecodeError:
                error_message = error_data
            raise InstagramAPIError(
                message=f"Instagram API error: {error_message}",
                status_code=e.code,
                payload=error_json if 'error_json' in locals() else None
            )
        except urllib.error.URLError as e:
            raise InstagramAPIError(message=f"Failed to reach Instagram API: {e.reason}")

    def create_reel_container(self, connection: InstagramConnection, video_url: str, caption: str) -> str:
        """
        Create an Instagram Reel media container.
        Returns the container ID.
        """
        token = self._get_access_token(connection)
        endpoint = f"/{connection.instagram_account_id}/media"
        data = {
            "media_type": "REELS",
            "video_url": video_url,
            "caption": caption,
        }
        response = self._make_request("POST", endpoint, token, data=data)
        container_id = response.get("id")
        if not container_id:
            raise InstagramAPIError("No container ID returned from Instagram API")
        return container_id

    def get_container_status(self, connection: InstagramConnection, container_id: str) -> Dict[str, Any]:
        """
        Get the status of a media container.
        Returns a dict with at least 'status_code' and optionally 'status'.
        """
        token = self._get_access_token(connection)
        endpoint = f"/{container_id}"
        params = {"fields": "status_code,status"}
        return self._make_request("GET", endpoint, token, params=params)

    def publish_container(self, connection: InstagramConnection, container_id: str) -> str:
        """
        Publish a media container.
        Returns the Instagram media ID.
        """
        token = self._get_access_token(connection)
        endpoint = f"/{connection.instagram_account_id}/media_publish"
        data = {"creation_id": container_id}
        response = self._make_request("POST", endpoint, token, data=data)
        media_id = response.get("id")
        if not media_id:
            raise InstagramAPIError("No media ID returned from Instagram API")
        return media_id

    def get_account_info(self, connection: InstagramConnection) -> Dict[str, Any]:
        """Get basic info about the Instagram account."""
        token = self._get_access_token(connection)
        endpoint = f"/{connection.instagram_account_id}"
        params = {"fields": "id,username,name"}
        return self._make_request("GET", endpoint, token, params=params)

    def get_media_insights(self, connection: InstagramConnection, media_id: str, metrics: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Get insights for an Instagram media object.
        Returns a dictionary with the requested metrics.
        """
        token = self._get_access_token(connection)
        endpoint = f"/{media_id}/insights"
        
        # Default metrics for Instagram Reels if none specified
        if metrics is None:
            metrics = ["reach", "saved", "views", "likes", "comments", "shares"]
        
        params = {
            "metric": ",".join(metrics)
        }
        
        return self._make_request("GET", endpoint, token, params=params)

    def get_account_insights(self, connection: InstagramConnection, metric: str, period: str = 'day') -> Dict[str, Any]:
        """
        Get insights for an Instagram business/account.
        Note: This requires the instagram_manage_insights permission.
        """
        token = self._get_access_token(connection)
        endpoint = f"/{connection.instagram_account_id}/insights"
        
        params = {
            "metric": metric,
            "period": period
        }
        
        return self._make_request("GET", endpoint, token, params=params)
        
    def normalize_media_insights(self, insights_response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize the Instagram insights response into a simpler dictionary format.
        Converts from the API format:
        {
          "data": [
            {
              "name": "impressions",
              "period": "lifetime",
              "values": [{"value": 1234}]
            },
            ...
          ]
        }
        To:
        {
          "impressions": 1234,
          "reach": 567,
          ...
        }
        """
        normalized = {}
        
        if "data" in insights_response:
            for metric_entry in insights_response["data"]:
                metric_name = metric_entry.get("name")
                # Get the latest value (usually the last one in the array)
                values = metric_entry.get("values", [])
                if values:
                    # Take the most recent value
                    latest_value = values[-1].get("value")
                    normalized[metric_name] = latest_value
                    
        return normalized

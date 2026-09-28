// Source: kikimaru-assets/rig-layout.json. Kept inline for file:// use.
window.KIKIMARU_RIG = {
  "canvas": {
    "width": 400,
    "height": 560,
    "groundY": 540
  },
  "defaultApronColor": "#85a86d",
  "views": {
    "front": [
      {
        "id": "left_foot",
        "part": "foot",
        "x": 90,
        "y": 489,
        "w": 103,
        "h": 56,
        "pivot": [
          0.5,
          0.1
        ]
      },
      {
        "id": "right_foot",
        "part": "foot",
        "x": 214,
        "y": 489,
        "w": 103,
        "h": 56,
        "pivot": [
          0.5,
          0.1
        ],
        "mirror": true
      },
      {
        "id": "body",
        "part": "body",
        "x": 83,
        "y": 278,
        "w": 234,
        "h": 230,
        "pivot": [
          0.5,
          0.1
        ]
      },
      {
        "id": "apron",
        "part": "apron_tint",
        "x": 106,
        "y": 316,
        "w": 188,
        "h": 180,
        "pivot": [
          0.5,
          0.1
        ],
        "tint": true
      },
      {
        "id": "badge",
        "part": "badge",
        "x": 144,
        "y": 401,
        "w": 112,
        "h": 67,
        "pivot": [
          0.5,
          0.1
        ]
      },
      {
        "id": "far_arm",
        "part": "arm",
        "x": 79,
        "y": 334,
        "w": 43,
        "h": 100,
        "pivot": [
          0.5,
          0.1
        ],
        "mirror": true
      },
      {
        "id": "near_arm",
        "part": "arm",
        "x": 278,
        "y": 334,
        "w": 43,
        "h": 100,
        "pivot": [
          0.5,
          0.1
        ]
      },
      {
        "id": "head",
        "part": "head_idle",
        "x": 20,
        "y": 15,
        "w": 360,
        "h": 329,
        "pivot": [
          0.5,
          0.1
        ]
      }
    ],
    "right": [
      {
        "id": "far_arm",
        "part": "arm",
        "x": 282,
        "y": 334,
        "w": 40,
        "h": 94,
        "pivot": [
          0.5,
          0.1
        ],
        "mirror": true
      },
      {
        "id": "left_foot",
        "part": "foot",
        "x": 117,
        "y": 491,
        "w": 98,
        "h": 53,
        "pivot": [
          0.5,
          0.1
        ]
      },
      {
        "id": "right_foot",
        "part": "foot",
        "x": 213,
        "y": 491,
        "w": 105,
        "h": 56,
        "pivot": [
          0.5,
          0.1
        ]
      },
      {
        "id": "body",
        "part": "body",
        "x": 99,
        "y": 282,
        "w": 222,
        "h": 220,
        "pivot": [
          0.5,
          0.1
        ]
      },
      {
        "id": "apron",
        "part": "apron_tint",
        "x": 144,
        "y": 320,
        "w": 164,
        "h": 174,
        "pivot": [
          0.5,
          0.1
        ],
        "tint": true
      },
      {
        "id": "badge",
        "part": "badge",
        "x": 173,
        "y": 405,
        "w": 104,
        "h": 67,
        "pivot": [
          0.5,
          0.1
        ]
      },
      {
        "id": "near_arm",
        "part": "arm",
        "x": 106,
        "y": 332,
        "w": 45,
        "h": 100,
        "pivot": [
          0.5,
          0.1
        ]
      },
      {
        "id": "head",
        "part": "head_idle",
        "x": 20,
        "y": 15,
        "w": 360,
        "h": 338,
        "pivot": [
          0.5,
          0.1
        ]
      }
    ]
  },
  "notes": [
    "Coordinates are starter rig layout verified in preview, not physical hitboxes.",
    "Left-facing mirrors entire right rig.",
    "Arm art is reused/mirrored for pairs; full-body parts animate by translation/rotation.",
    "Render raised arms after head so victory hands stay visible.",
    "Apron is tinted separately; badge remains untinted."
  ]
};

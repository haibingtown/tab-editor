import React, { Component } from 'react';

export default class Rest extends Component {
  render() {
    return (
      <svg width='10.53' height='26.7' x={this.props.x} y={30}>
        <path
          fill={this.props.color}
          d='M3.576.56c-.247.105-.394.465-.28.717.033.036.39.464.75.936.824.927.964 1.147 1.146 1.575.718 1.47.324 3.34-.934 4.522-.106.14-.57.532-1.006.856-1.25 1.077-1.827 1.69-2.04 2.23-.077.14-.077.28-.077.5-.034.498 0 .54 1.478 2.256 2.003 2.405 3.438 4.092 3.55 4.198l.106.104-.144-.07c-1.976-.822-4.197-1.217-4.95-.857a.854.854 0 0 0-.506.5c-.29.61-.21 1.51.22 2.832.392 1.185 1.18 2.76 1.967 3.943.324.506.936 1.292 1.006 1.328.106.107.254.07.358 0 .108-.14.108-.253-.102-.497-.753-1.077-1.11-3.305-.683-4.488.175-.533.395-.822.787-1.004 1.04-.464 3.34.11 4.305 1.075.07.072.218.22.288.254.254.106.612-.034.718-.288.15-.254.07-.428-.253-.822-.605-.717-2.433-2.87-2.685-3.192-.648-.752-.936-1.468-1.007-2.368-.034-1.148.43-2.363 1.295-3.16.105-.14.57-.533 1-.855 1.328-1.113 1.87-1.723 2.08-2.3.148-.465.078-.894-.246-1.288-.112-.104-1.365-1.652-2.833-3.41C4.87 1.427 4.154.562 4.05.527a.736.736 0 0 0-.47.035z' fillRule='evenodd'
        />
      </svg>
    );
  }
}

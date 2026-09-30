package model

import "time"

type DockerImage struct {
	ID             string    `json:"id"`
	RepoTags       []string  `json:"repo_tags"`
	RepoDigests    []string  `json:"repo_digests"`
	CreatedAt      time.Time `json:"created_at"`
	Size           int64     `json:"size_bytes"`
	ContainerCount int       `json:"container_count"`
}

type DockerImageDetail struct {
	DockerImage
	Architecture string `json:"architecture,omitempty"`
	OS           string `json:"os,omitempty"`
}
